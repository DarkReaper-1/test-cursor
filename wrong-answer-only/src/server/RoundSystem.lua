--[[
	RoundSystem (ModuleScript — ServerScriptService)
	Runs a single round end-to-end: teleport, fake-rule reveal, timer, safety
	timeout, and round-specific mechanics for rounds 1–2. Rounds 3–5 are driven
	by map mechanic scripts listening to RoundStarted.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")

local RoundConfig = require(ReplicatedStorage:WaitForChild("RoundConfig"))
local GameUtils = require(ReplicatedStorage:WaitForChild("GameUtils"))
local EliminationHandler = require(ServerScriptService:WaitForChild("EliminationHandler"))

local GameEvents = ReplicatedStorage:WaitForChild("GameEvents")
local RoundStarted = GameEvents:WaitForChild("RoundStarted") :: RemoteEvent
local RoundEnded = GameEvents:WaitForChild("RoundEnded") :: RemoteEvent
local RuleReveal = GameEvents:WaitForChild("RuleReveal") :: RemoteEvent

local RoundSystem = {}

-- Track who pressed the correct button (round 2)
local buttonSafePlayers: { [Player]: boolean } = {}
local correctButtonName: string? = nil
local round2Connections: { RBXScriptConnection } = {}

----------------------------------------------------------------------
-- Round 1 helpers — drop StartingPlatform, explode SafePlatform on reveal
----------------------------------------------------------------------

local function getMap(mapName: string): Instance?
	local maps = workspace:FindFirstChild("Maps")
	return maps and maps:FindFirstChild(mapName)
end

local function runRound1Mechanics(timeLimit: number)
	local map = getMap("Map_Platform")
	if not map then
		return
	end

	local starting = map:FindFirstChild("StartingPlatform", true)
	local safePlatform = map:FindFirstChild("SafePlatform", true)

	-- Drop starting platform 4 seconds after round start
	task.delay(4, function()
		if starting and starting:IsA("BasePart") then
			starting.Transparency = 0.85
			starting.CanCollide = false
		end
	end)

	-- After round natural end we'll restore — schedule restore at timeLimit + a beat
	task.delay(timeLimit + 1, function()
		if starting and starting:IsA("BasePart") then
			starting.Transparency = 0
			starting.CanCollide = true
		end
	end)

	-- Schedule reveal explosion slightly after RoundEnded is fired by caller
	-- Exposed via RoundSystem._revealRound1 for RoundEnded hook inside RunRound
	RoundSystem._onRound1Reveal = function()
		if not (safePlatform and safePlatform:IsA("BasePart")) then
			return
		end
		-- Orange flash
		local original = safePlatform.Color
		safePlatform.Color = Color3.fromRGB(255, 120, 0)
		local flash = Instance.new("PointLight")
		flash.Brightness = 8
		flash.Range = 40
		flash.Color = Color3.fromRGB(255, 100, 0)
		flash.Parent = safePlatform

		local explosion = Instance.new("Explosion")
		explosion.Position = safePlatform.Position
		explosion.BlastRadius = 0 -- visual only; kills already handled by Touched
		explosion.BlastPressure = 0
		explosion.Parent = workspace

		task.delay(1.2, function()
			if safePlatform then
				safePlatform.Color = original
			end
			if flash then
				flash:Destroy()
			end
		end)
	end
end

----------------------------------------------------------------------
-- Round 2 helpers — one correct button, wire all Touched
----------------------------------------------------------------------

local function cleanupRound2()
	for _, conn in ipairs(round2Connections) do
		conn:Disconnect()
	end
	table.clear(round2Connections)
	buttonSafePlayers = {}
	correctButtonName = nil
end

local function wireButton(button: BasePart, isCorrect: boolean)
	local debounce: { [Player]: number } = {}
	local conn = button.Touched:Connect(function(hit)
		local character = hit:FindFirstAncestorOfClass("Model")
		if not character then
			return
		end
		local player = Players:GetPlayerFromCharacter(character)
		if not player then
			return
		end
		if not EliminationHandler.IsAlive(player) then
			return
		end

		local now = os.clock()
		if debounce[player] and (now - debounce[player]) < 0.5 then
			return
		end
		debounce[player] = now

		if isCorrect then
			buttonSafePlayers[player] = true
			-- Gold flash
			local old = button.Color
			button.Color = Color3.fromRGB(255, 215, 0)
			local light = Instance.new("PointLight")
			light.Color = Color3.fromRGB(255, 215, 0)
			light.Brightness = 5
			light.Range = 16
			light.Parent = button
			Debris:AddItem(light, 1.5)
			task.delay(0.6, function()
				if button and not (correctButtonName and button.Name == correctButtonName and RoundSystem._round2Ended) then
					-- Keep gold if we're revealing; otherwise brief flash
				end
			end)
			print(string.format("[RoundSystem] %s pressed CORRECT button %s", player.Name, button.Name))
		else
			EliminationHandler.EliminatePlayer(player, "Pressed the wrong button")
		end
	end)
	table.insert(round2Connections, conn)
end

local function runRound2Mechanics()
	cleanupRound2()
	RoundSystem._round2Ended = false

	local map = getMap("Map_Button")
	if not map then
		return
	end

	local buttons: { BasePart } = {}
	for i = 1, 20 do
		local btn = map:FindFirstChild("Button" .. i, true)
		if btn and btn:IsA("BasePart") then
			table.insert(buttons, btn)
			btn.Color = Color3.fromRGB(255, 255, 255)
		end
	end

	if #buttons == 0 then
		warn("[RoundSystem] No buttons found in Map_Button")
		return
	end

	local correct = buttons[math.random(1, #buttons)]
	correctButtonName = correct.Name
	print("[RoundSystem] Correct button this round:", correctButtonName)

	for _, btn in ipairs(buttons) do
		wireButton(btn, btn == correct)
	end
end

local function finishRound2Reveal()
	RoundSystem._round2Ended = true
	local map = getMap("Map_Button")
	if not map then
		cleanupRound2()
		return
	end

	-- Force-eliminate anyone who pressed nothing
	for _, player in ipairs(EliminationHandler.GetAlivePlayers()) do
		if not buttonSafePlayers[player] then
			EliminationHandler.EliminatePlayer(player, "Pressed the wrong button")
		end
	end

	-- Reveal correct in gold; reset others white
	for i = 1, 20 do
		local btn = map:FindFirstChild("Button" .. i, true)
		if btn and btn:IsA("BasePart") then
			if correctButtonName and btn.Name == correctButtonName then
				btn.Color = Color3.fromRGB(255, 215, 0)
			else
				btn.Color = Color3.fromRGB(255, 255, 255)
			end
		end
	end

	task.delay(3, function()
		cleanupRound2()
		-- Reset all buttons white for next match
		if map then
			for i = 1, 20 do
				local btn = map:FindFirstChild("Button" .. i, true)
				if btn and btn:IsA("BasePart") then
					btn.Color = Color3.fromRGB(255, 255, 255)
				end
			end
		end
	end)
end

----------------------------------------------------------------------
-- RunRound — main entry called by GameManager
----------------------------------------------------------------------

--[[
	RunRound(roundNumber)
	Yields until the round is finished (time limit, ≤1 alive, or safety timeout).
	Returns the list of surviving players.
]]
function RoundSystem.RunRound(roundNumber: number): { Player }
	local round = RoundConfig.GetRound(roundNumber)
	if not round then
		warn("[RoundSystem] Invalid roundNumber:", roundNumber)
		return EliminationHandler.GetAlivePlayers()
	end

	local mapName = round.mapName
	local timeLimit = round.timeLimit
	local fakeRule = round.fakeRule
	local revealText = round.revealText
	local timeoutReason = RoundConfig.GetTimeoutReason(roundNumber)

	EliminationHandler.CurrentMapName = mapName
	RoundSystem._onRound1Reveal = nil

	-- Show this map (hide others)
	GameUtils.ShowMap(mapName)
	-- Always keep Lobby visible-ish? Spec says show map — HideAllMaps then ShowMap is fine.

	-- Teleport alive players
	local alive = EliminationHandler.GetAlivePlayers()
	GameUtils.TeleportToMap(alive, mapName)

	-- Relocate spectators via bridge
	local spectatorBridge = ServerScriptService:FindFirstChild("SpectatorBridge")
	if spectatorBridge and spectatorBridge:IsA("BindableEvent") then
		spectatorBridge:Fire("relocate", mapName)
	end

	-- Fake rule reveal (4 seconds of dread)
	RuleReveal:FireAllClients(fakeRule, roundNumber, round.roundName)
	GameUtils.AnnounceToAll(string.format("Round %d — %s", roundNumber, fakeRule), Color3.fromRGB(200, 100, 255))
	task.wait(4)

	-- Round-specific setup BEFORE RoundStarted so listeners are ready after fire
	if roundNumber == 1 then
		runRound1Mechanics(timeLimit)
	elseif roundNumber == 2 then
		runRound2Mechanics()
	end

	-- Fire RoundStarted — map mechanics for R3–R5 listen to this
	local payload = {
		roundNumber = roundNumber,
		rule = fakeRule,
		timeLimit = timeLimit,
		mapName = mapName,
		roundName = round.roundName,
	}
	RoundStarted:FireAllClients(payload)
	-- Also fire a BindableEvent for server-side map scripts if present
	local roundStartedBindable = ServerScriptService:FindFirstChild("RoundStartedBindable")
	if not roundStartedBindable then
		roundStartedBindable = Instance.new("BindableEvent")
		roundStartedBindable.Name = "RoundStartedBindable"
		roundStartedBindable.Parent = ServerScriptService
	end
	roundStartedBindable:Fire(payload)

	print(string.format("[RoundSystem] Round %d started on %s (%ds)", roundNumber, mapName, timeLimit))

	-- Wait for timeLimit or ≤1 alive, polling every 0.5s.
	-- Hard stop at timeLimit + 10s (safety timeout).
	local elapsed = 0
	local safetyLimit = timeLimit + 10
	local endedEarly = false
	while elapsed < safetyLimit do
		if EliminationHandler.GetAliveCount() <= 1 then
			endedEarly = true
			break
		end
		if elapsed >= timeLimit then
			break
		end
		task.wait(0.5)
		elapsed += 0.5
	end

	-- Natural time end: round 2 must resolve players who never pressed
	if roundNumber == 2 and not RoundSystem._round2Ended then
		finishRound2Reveal()
	end

	-- Safety timeout: force-eliminate stragglers so the round cannot hang
	if not endedEarly and elapsed >= safetyLimit and EliminationHandler.GetAliveCount() > 1 then
		warn("[RoundSystem] Safety timeout hit for round", roundNumber)
		for _, p in ipairs(EliminationHandler.GetAlivePlayers()) do
			EliminationHandler.EliminatePlayer(p, timeoutReason)
			if EliminationHandler.GetAliveCount() <= 1 then
				break
			end
		end
	end

	local survivors = EliminationHandler.GetAlivePlayers()
	local survivorNames = {}
	for _, p in ipairs(survivors) do
		table.insert(survivorNames, p.Name)
	end

	-- Reveal effects
	if roundNumber == 1 and RoundSystem._onRound1Reveal then
		RoundSystem._onRound1Reveal()
	end

	RoundEnded:FireAllClients({
		roundNumber = roundNumber,
		survivors = survivorNames,
		revealText = revealText,
	})

	-- Server bindable for SwapMechanic etc.
	local roundEndedBindable = ServerScriptService:FindFirstChild("RoundEndedBindable")
	if not roundEndedBindable then
		roundEndedBindable = Instance.new("BindableEvent")
		roundEndedBindable.Name = "RoundEndedBindable"
		roundEndedBindable.Parent = ServerScriptService
	end
	roundEndedBindable:Fire({
		roundNumber = roundNumber,
		survivors = survivorNames,
		revealText = revealText,
		mapName = mapName,
	})

	GameUtils.AnnounceToAll(revealText, Color3.fromRGB(255, 220, 80))
	print(string.format("[RoundSystem] Round %d ended — %d survivors", roundNumber, #survivors))

	-- Record round survived for each survivor via DataStore bridge
	local dsBridge = ServerScriptService:FindFirstChild("DataStoreBridge")
	if dsBridge and dsBridge:IsA("BindableFunction") then
		for _, player in ipairs(survivors) do
			pcall(function()
				dsBridge:Invoke("RecordRoundSurvived", player)
			end)
		end
	end

	return survivors
end

return RoundSystem
