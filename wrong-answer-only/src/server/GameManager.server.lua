--[[
	GameManager (Script — ServerScriptService)
	Top-level state machine for "Wrong Answer Only":
	  LOBBY → COUNTING_DOWN → IN_ROUND → INTERMISSION → GAME_OVER → LOBBY
	Never skips states. Minimum 2 players to start (testing).
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local RoundConfig = require(ReplicatedStorage:WaitForChild("RoundConfig"))
local GameUtils = require(ReplicatedStorage:WaitForChild("GameUtils"))
local EliminationHandler = require(ServerScriptService:WaitForChild("EliminationHandler"))
local RoundSystem = require(ServerScriptService:WaitForChild("RoundSystem"))

local GameEvents = ReplicatedStorage:WaitForChild("GameEvents")
local CountdownTick = GameEvents:WaitForChild("CountdownTick") :: RemoteEvent
local GameOver = GameEvents:WaitForChild("GameOver") :: RemoteEvent
local SpectatorMode = GameEvents:WaitForChild("SpectatorMode") :: RemoteEvent

-- Tuning
local MIN_PLAYERS = 2 -- testing value (prompt); lobby messages still say X/4 for flavor? Prompt: "X/4 needed" but min 2. Use MIN_PLAYERS for gate, display min.
local LOBBY_COUNTDOWN = 30
local INTERMISSION_SECONDS = 5
local WINNER_SCREEN_SECONDS = 10

-- State machine
local State = {
	LOBBY = "LOBBY",
	COUNTING_DOWN = "COUNTING_DOWN",
	IN_ROUND = "IN_ROUND",
	INTERMISSION = "INTERMISSION",
	GAME_OVER = "GAME_OVER",
}

local currentState = State.LOBBY
local matchInProgress = false

local function setState(newState: string)
	print(string.format("[GameManager] %s → %s", currentState, newState))
	currentState = newState
end

local function getDataStoreBridge(): BindableFunction?
	local bridge = ServerScriptService:FindFirstChild("DataStoreBridge")
	if bridge and bridge:IsA("BindableFunction") then
		return bridge
	end
	return nil
end

local function getSpectatorBridge(): BindableEvent?
	local bridge = ServerScriptService:FindFirstChild("SpectatorBridge")
	if bridge and bridge:IsA("BindableEvent") then
		return bridge
	end
	return nil
end

----------------------------------------------------------------------
-- Player join / leave during match
----------------------------------------------------------------------

Players.PlayerAdded:Connect(function(player)
	-- Give character time / always register presence
	player.CharacterAdded:Connect(function()
		-- Mid-game joiners become spectators, not alive competitors
		if matchInProgress then
			EliminationHandler.UnregisterPlayer(player)
			SpectatorMode:FireClient(player, true)
			local bridge = getSpectatorBridge()
			if bridge then
				bridge:Fire("enter", player)
			end
		end
	end)

	-- If join happens while match already running and character already exists
	if matchInProgress then
		EliminationHandler.UnregisterPlayer(player)
		SpectatorMode:FireClient(player, true)
		local bridge = getSpectatorBridge()
		if bridge then
			bridge:Fire("enter", player)
		end
	end
end)

Players.PlayerRemoving:Connect(function(player)
	if EliminationHandler.IsAlive(player) then
		-- Auto-eliminate (unregister) — don't bother ghost effects on leaving player
		EliminationHandler.UnregisterPlayer(player)
		print("[GameManager] Player left mid-alive:", player.Name)
	end
end)

----------------------------------------------------------------------
-- LOBBY — wait until enough players
----------------------------------------------------------------------

local function runLobby()
	setState(State.LOBBY)
	matchInProgress = false
	EliminationHandler.CurrentMapName = "Lobby"

	GameUtils.ShowMap("Lobby")

	while #Players:GetPlayers() < MIN_PLAYERS do
		local count = #Players:GetPlayers()
		CountdownTick:FireAllClients({
			phase = "lobby",
			seconds = 0,
			playerCount = count,
			needed = MIN_PLAYERS,
			message = string.format("Waiting for players... %d/%d needed", count, MIN_PLAYERS),
		})
		task.wait(2)
	end
end

----------------------------------------------------------------------
-- COUNTING_DOWN — 30s lobby countdown; cancel if players drop below min
----------------------------------------------------------------------

local function runCountdown(): boolean
	setState(State.COUNTING_DOWN)

	for remaining = LOBBY_COUNTDOWN, 1, -1 do
		local count = #Players:GetPlayers()
		if count < MIN_PLAYERS then
			CountdownTick:FireAllClients({
				phase = "lobby",
				seconds = 0,
				playerCount = count,
				needed = MIN_PLAYERS,
				message = string.format("Not enough players — waiting... %d/%d", count, MIN_PLAYERS),
			})
			return false -- cancel
		end

		CountdownTick:FireAllClients({
			phase = "countdown",
			seconds = remaining,
			playerCount = count,
			needed = MIN_PLAYERS,
			message = string.format("Game starting in %d...", remaining),
		})
		task.wait(1)
	end

	return true
end

----------------------------------------------------------------------
-- GAME_OVER
----------------------------------------------------------------------

local function runGameOver(winner: Player?)
	setState(State.GAME_OVER)

	local winnerName = if winner then winner.Name else "Nobody"
	GameOver:FireAllClients(winnerName, winner and winner.UserId or 0)
	GameUtils.AnnounceToAll(string.format("🏆 %s WINS!", winnerName), Color3.fromRGB(255, 215, 0))

	local bridge = getDataStoreBridge()
	if bridge then
		pcall(function()
			bridge:Invoke("RecordGamePlayed")
		end)
		if winner then
			pcall(function()
				bridge:Invoke("RecordWin", winner)
			end)
		end
		pcall(function()
			bridge:Invoke("SaveAll")
		end)
	end

	task.wait(WINNER_SCREEN_SECONDS)

	-- Full reset
	local spectatorBridge = getSpectatorBridge()
	if spectatorBridge then
		spectatorBridge:Fire("exitAll")
	end
	EliminationHandler.ResetAllPlayers()
	GameUtils.ShowMap("Lobby")
	matchInProgress = false
end

----------------------------------------------------------------------
-- Match loop: rounds 1–5 with intermissions
----------------------------------------------------------------------

local function runMatch()
	matchInProgress = true
	EliminationHandler.ResetAllPlayers()

	local totalRounds = RoundConfig.GetTotalRounds()

	for roundNumber = 1, totalRounds do
		-- Skip to endgame if ≤1 alive
		local aliveCount = EliminationHandler.GetAliveCount()
		if aliveCount <= 0 then
			runGameOver(nil)
			return
		end
		if aliveCount <= 1 then
			local survivors = EliminationHandler.GetAlivePlayers()
			runGameOver(survivors[1])
			return
		end

		setState(State.IN_ROUND)
		RoundSystem.RunRound(roundNumber)

		aliveCount = EliminationHandler.GetAliveCount()
		if aliveCount <= 0 then
			runGameOver(nil)
			return
		end
		if aliveCount <= 1 or roundNumber == totalRounds then
			local survivors = EliminationHandler.GetAlivePlayers()
			-- If multiple still alive after final round, first survivor / random?
			-- Spec: last player standing wins. After round 5 with multiple: pick among survivors
			-- by... remaining alive are all "winners" of twists — first in list is fine,
			-- or we could declare all survivors. Prefer single winner = first / longest.
			if #survivors == 1 then
				runGameOver(survivors[1])
				return
			elseif #survivors == 0 then
				runGameOver(nil)
				return
			elseif roundNumber == totalRounds then
				-- Multiple survived final round — declare first as winner (or shuffle)
				local shuffled = GameUtils.ShuffleTable(survivors)
				runGameOver(shuffled[1])
				return
			end
		end

		-- INTERMISSION between rounds
		if roundNumber < totalRounds then
			setState(State.INTERMISSION)
			local survivors = EliminationHandler.GetAlivePlayers()
			local names = {}
			for _, p in ipairs(survivors) do
				table.insert(names, p.Name)
			end
			CountdownTick:FireAllClients({
				phase = "intermission",
				seconds = INTERMISSION_SECONDS,
				playerCount = #survivors,
				survivors = names,
				message = string.format("%d survivors — next round soon...", #survivors),
			})
			task.wait(INTERMISSION_SECONDS)
		end
	end
end

----------------------------------------------------------------------
-- Main forever loop
----------------------------------------------------------------------

print("[GameManager] Wrong Answer Only — server booting")

-- Ensure bindables that peer scripts expect exist early
do
	if not ServerScriptService:FindFirstChild("RoundStartedBindable") then
		local be = Instance.new("BindableEvent")
		be.Name = "RoundStartedBindable"
		be.Parent = ServerScriptService
	end
	if not ServerScriptService:FindFirstChild("RoundEndedBindable") then
		local be = Instance.new("BindableEvent")
		be.Name = "RoundEndedBindable"
		be.Parent = ServerScriptService
	end
end

while true do
	runLobby()
	local started = runCountdown()
	if started then
		runMatch()
		-- runMatch always ends in GAME_OVER which returns here → LOBBY next loop
	end
	-- Dropped below min during countdown — back to LOBBY without skipping states
end
