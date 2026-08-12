--[[
	EliminationHandler (ModuleScript — ServerScriptService)
	Single source of truth for who is alive. ALL elimination logic lives here
	on the server. Clients never decide eliminations — they only receive events.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local EliminationHandler = {}

-- {[Player]: true} — players still in the match
EliminationHandler.AlivePlayers = {} :: { [Player]: boolean }

-- Set by RoundSystem before each round (used for spectator relocate / map center)
EliminationHandler.CurrentMapName = "Lobby"

-- Valid elimination reason strings (exact match required)
local VALID_REASONS: { [string]: boolean } = {
	["Touched the wrong platform"] = true,
	["Pressed the wrong button"] = true,
	["Ran the wrong direction"] = true,
	["Collected a forbidden coin"] = true,
	["Could not adapt in time"] = true,
	["Fell out of bounds"] = true,
}

local FALLBACK_REASON = "Could not adapt in time"
local DEBOUNCE_SECONDS = 0.5

-- Per-player debounce timestamps
local lastEliminateAttempt: { [Player]: number } = {}

local GameEvents = ReplicatedStorage:WaitForChild("GameEvents")
local PlayerEliminated = GameEvents:WaitForChild("PlayerEliminated") :: RemoteEvent
local SpectatorMode = GameEvents:WaitForChild("SpectatorMode") :: RemoteEvent

----------------------------------------------------------------------
-- Internals
----------------------------------------------------------------------

local function getMapCenter(mapName: string): Vector3
	local maps = workspace:FindFirstChild("Maps")
	if not maps then
		return Vector3.new(0, 1, 0)
	end
	local mapModel = maps:FindFirstChild(mapName)
	if not mapModel then
		return Vector3.new(0, 1, 0)
	end

	-- Prefer GetBoundingBox when available (Models)
	if mapModel:IsA("Model") then
		local ok, cf = pcall(function()
			return mapModel:GetBoundingBox()
		end)
		if ok and typeof(cf) == "CFrame" then
			return cf.Position
		end
	end

	-- Fallback: average of BasePart positions
	local sum = Vector3.zero
	local count = 0
	for _, desc in ipairs(mapModel:GetDescendants()) do
		if desc:IsA("BasePart") then
			sum += desc.Position
			count += 1
		end
	end
	if count > 0 then
		return sum / count
	end
	return Vector3.new(0, 1, 0)
end

local function applyGhostVisual(character: Model)
	for _, desc in ipairs(character:GetDescendants()) do
		if desc:IsA("BasePart") then
			desc.Transparency = 0.7
		end
	end

	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp and hrp:IsA("BasePart") then
		-- Remove old elimination light if any
		local existing = hrp:FindFirstChild("EliminationLight")
		if existing then
			existing:Destroy()
		end
		local light = Instance.new("PointLight")
		light.Name = "EliminationLight"
		light.Color = Color3.fromRGB(170, 0, 255)
		light.Brightness = 2
		light.Range = 12
		light.Parent = hrp
	end

	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.WalkSpeed = 0
	end
end

----------------------------------------------------------------------
-- Public API
----------------------------------------------------------------------

function EliminationHandler.IsAlive(player: Player): boolean
	return EliminationHandler.AlivePlayers[player] == true
end

function EliminationHandler.GetAlivePlayers(): { Player }
	local list = {}
	for player, alive in pairs(EliminationHandler.AlivePlayers) do
		if alive and player.Parent == Players then
			table.insert(list, player)
		end
	end
	return list
end

function EliminationHandler.GetAliveCount(): number
	return #EliminationHandler.GetAlivePlayers()
end

--[[
	Eliminate a player for a validated reason.
	- Guards non-alive players (never eliminate twice)
	- 0.5s debounce per player
	- Invalid reasons fall back to "Could not adapt in time"
]]
function EliminationHandler.EliminatePlayer(player: Player, reason: string)
	if typeof(player) ~= "Instance" or not player:IsA("Player") then
		return
	end
	if not EliminationHandler.IsAlive(player) then
		return
	end

	local now = os.clock()
	local last = lastEliminateAttempt[player]
	if last and (now - last) < DEBOUNCE_SECONDS then
		return
	end
	lastEliminateAttempt[player] = now

	-- Validate reason string
	local safeReason = reason
	if typeof(safeReason) ~= "string" or not VALID_REASONS[safeReason] then
		safeReason = FALLBACK_REASON
	end

	-- Unregister first so re-entrant Touched events cannot double-kill
	EliminationHandler.AlivePlayers[player] = nil

	-- Visual + teleport effects
	local character = player.Character
	if character then
		local center = getMapCenter(EliminationHandler.CurrentMapName)
		local hrp = character:FindFirstChild("HumanoidRootPart")
		if hrp and hrp:IsA("BasePart") then
			hrp.CFrame = CFrame.new(center + Vector3.new(0, 80, 0))
		end
		applyGhostVisual(character)
	end

	-- Notify all clients of elimination
	PlayerEliminated:FireAllClients(player, safeReason)

	-- Put eliminated player into spectator mode (that client only)
	SpectatorMode:FireClient(player, true)

	-- Bridge to SpectatorSystem if present
	local spectatorBridge = ServerScriptService:FindFirstChild("SpectatorBridge")
	if spectatorBridge and spectatorBridge:IsA("BindableEvent") then
		spectatorBridge:Fire("enter", player)
	end

	print(string.format("[EliminationHandler] %s eliminated — %s", player.Name, safeReason))
end

--[[
	Restore every player for a fresh match:
	transparency, WalkSpeed, lights, lobby teleport, alive registry.
]]
function EliminationHandler.ResetAllPlayers()
	lastEliminateAttempt = {}
	EliminationHandler.AlivePlayers = {}
	EliminationHandler.CurrentMapName = "Lobby"

	local maps = workspace:FindFirstChild("Maps")
	local lobby = maps and maps:FindFirstChild("Lobby")
	local spawns: { SpawnLocation } = {}
	if lobby then
		for _, child in ipairs(lobby:GetDescendants()) do
			if child:IsA("SpawnLocation") then
				table.insert(spawns, child)
			end
		end
	end

	for _, player in ipairs(Players:GetPlayers()) do
		EliminationHandler.AlivePlayers[player] = true

		-- Exit spectator on clients
		SpectatorMode:FireClient(player, false)

		local character = player.Character
		if character then
			-- Restore parts
			for _, desc in ipairs(character:GetDescendants()) do
				if desc:IsA("BasePart") then
					-- Skip accessories handled separately; restore body parts
					if desc.Name ~= "Handle" or not desc.Parent or not desc.Parent:IsA("Accessory") then
						desc.Transparency = 0
					end
				end
				if desc:IsA("PointLight") and (desc.Name == "EliminationLight" or desc.Name == "SpectatorLight") then
					desc:Destroy()
				end
				if desc:IsA("BillboardGui") and desc.Name == "SpectatorTag" then
					desc:Destroy()
				end
			end

			-- Restore accessory transparency defaults (Handles often stay visible)
			for _, acc in ipairs(character:GetChildren()) do
				if acc:IsA("Accessory") then
					local handle = acc:FindFirstChild("Handle")
					if handle and handle:IsA("BasePart") then
						handle.Transparency = 0
					end
				end
			end

			local humanoid = character:FindFirstChildOfClass("Humanoid")
			if humanoid then
				humanoid.WalkSpeed = 16
			end

			-- Teleport to a lobby spawn
			local hrp = character:FindFirstChild("HumanoidRootPart")
			if hrp and hrp:IsA("BasePart") then
				if #spawns > 0 then
					local spawnPart = spawns[((player.UserId - 1) % #spawns) + 1]
					hrp.CFrame = spawnPart.CFrame + Vector3.new(0, 4, 0)
				else
					hrp.CFrame = CFrame.new(0, 6, 0)
				end
			end
		end
	end

	local exitBridge = ServerScriptService:FindFirstChild("SpectatorBridge")
	if exitBridge and exitBridge:IsA("BindableEvent") then
		exitBridge:Fire("exitAll")
	end

	print("[EliminationHandler] ResetAllPlayers — all players alive again")
end

function EliminationHandler.RegisterPlayer(player: Player)
	EliminationHandler.AlivePlayers[player] = true
end

function EliminationHandler.UnregisterPlayer(player: Player)
	EliminationHandler.AlivePlayers[player] = nil
	lastEliminateAttempt[player] = nil
end

-- Auto-cleanup when players leave
Players.PlayerRemoving:Connect(function(player)
	EliminationHandler.UnregisterPlayer(player)
end)

return EliminationHandler
