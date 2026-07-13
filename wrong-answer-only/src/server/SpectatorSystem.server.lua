--[[
	SpectatorSystem (Script — ServerScriptService)
	Manages ghost spectators: collision group, platforms above each map,
	visual effects, and relocation when rounds change.
	Cross-script API via BindableEvent "SpectatorBridge".
]]

local Players = game:GetService("Players")
local PhysicsService = game:GetService("PhysicsService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local GameUtils = require(ReplicatedStorage:WaitForChild("GameUtils"))

local GameEvents = ReplicatedStorage:WaitForChild("GameEvents")
local SpectatorMode = GameEvents:WaitForChild("SpectatorMode") :: RemoteEvent
local RoundStarted = GameEvents:WaitForChild("RoundStarted") :: RemoteEvent
local GameOverEvent = GameEvents:WaitForChild("GameOver") :: RemoteEvent

local SPECTATOR_GROUP = "Spectators"
local DEFAULT_GROUP = "Default"

-- Track who is spectating
local spectators: { [Player]: boolean } = {}
-- Cached platforms per map name
local platformCache: { [string]: BasePart } = {}

----------------------------------------------------------------------
-- Collision groups
----------------------------------------------------------------------

local function setupCollisionGroups()
	pcall(function()
		PhysicsService:RegisterCollisionGroup(SPECTATOR_GROUP)
	end)
	-- Spectators do not collide with Default world geometry they shouldn't block —
	-- Spec: no collide with Default, collide with each other + spectator platform
	pcall(function()
		PhysicsService:CollisionGroupSetCollidable(SPECTATOR_GROUP, DEFAULT_GROUP, false)
	end)
	pcall(function()
		PhysicsService:CollisionGroupSetCollidable(SPECTATOR_GROUP, SPECTATOR_GROUP, true)
	end)
end

setupCollisionGroups()

local function setCharacterCollisionGroup(character: Model, groupName: string)
	for _, desc in ipairs(character:GetDescendants()) do
		if desc:IsA("BasePart") then
			pcall(function()
				desc.CollisionGroup = groupName
			end)
		end
	end
end

----------------------------------------------------------------------
-- Spectator platforms (120x2x120, transparency 0.85, 100 studs above map)
----------------------------------------------------------------------

local function getOrCreatePlatform(mapName: string): BasePart
	if platformCache[mapName] and platformCache[mapName].Parent then
		return platformCache[mapName]
	end

	local center = GameUtils.GetMapCenter(mapName)
	local part = Instance.new("Part")
	part.Name = "SpectatorPlatform_" .. mapName
	part.Size = Vector3.new(120, 2, 120)
	part.Position = center + Vector3.new(0, 100, 0)
	part.Anchored = true
	part.CanCollide = true
	part.Transparency = 0.85
	part.Color = Color3.fromRGB(80, 40, 120)
	part.Material = Enum.Material.ForceField
	part.CollisionGroup = SPECTATOR_GROUP
	part.Parent = workspace

	-- Ensure Default players don't stand on it? Spec: Spectators group only collide.
	-- With Spectators↔Default = false, Default chars pass through — good.
	platformCache[mapName] = part
	return part
end

local function teleportToPlatform(player: Player, mapName: string)
	local platform = getOrCreatePlatform(mapName)
	local character = player.Character
	if not character then
		return
	end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp and hrp:IsA("BasePart") then
		local offset = Vector3.new(math.random(-20, 20), 4, math.random(-20, 20))
		hrp.CFrame = CFrame.new(platform.Position + offset)
	end
end

----------------------------------------------------------------------
-- Ghost visuals
----------------------------------------------------------------------

local function applyGhostEffect(player: Player)
	local character = player.Character
	if not character then
		return
	end

	for _, desc in ipairs(character:GetDescendants()) do
		if desc:IsA("BasePart") and desc.Name ~= "HumanoidRootPart" then
			desc.Transparency = 0.6
		elseif desc:IsA("BasePart") and desc.Name == "HumanoidRootPart" then
			desc.Transparency = 1
		end
	end

	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp and hrp:IsA("BasePart") then
		local old = hrp:FindFirstChild("SpectatorLight")
		if old then
			old:Destroy()
		end
		local light = Instance.new("PointLight")
		light.Name = "SpectatorLight"
		light.Color = Color3.fromRGB(170, 0, 255)
		light.Brightness = 2
		light.Range = 14
		light.Parent = hrp

		local oldTag = character:FindFirstChild("SpectatorTag")
		if oldTag then
			oldTag:Destroy()
		end
		local billboard = Instance.new("BillboardGui")
		billboard.Name = "SpectatorTag"
		billboard.Size = UDim2.fromScale(0, 0)
		billboard.SizeOffset = Vector2.new(0, 0)
		billboard.StudsOffset = Vector3.new(0, 3, 0)
		billboard.AlwaysOnTop = true
		billboard.MaxDistance = 200
		billboard.Adornee = hrp
		billboard.Parent = character

		-- Fixed size via Absolute — use scale on a frame child
		local holder = Instance.new("Frame")
		holder.BackgroundTransparency = 1
		holder.Size = UDim2.fromOffset(200, 40)
		holder.Parent = billboard
		billboard.Size = UDim2.fromOffset(200, 40)

		local label = Instance.new("TextLabel")
		label.BackgroundTransparency = 1
		label.Size = UDim2.fromScale(1, 1)
		label.Font = Enum.Font.GothamBold
		label.TextScaled = true
		label.Text = "👻 " .. player.DisplayName
		label.TextColor3 = Color3.fromRGB(220, 80, 255)
		label.TextStrokeTransparency = 0.4
		label.Parent = holder
	end

	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.WalkSpeed = 16
	end

	setCharacterCollisionGroup(character, SPECTATOR_GROUP)
end

local function clearGhostEffect(player: Player)
	local character = player.Character
	if not character then
		return
	end

	for _, desc in ipairs(character:GetDescendants()) do
		if desc:IsA("BasePart") then
			if desc.Name == "HumanoidRootPart" then
				desc.Transparency = 1
			elseif not (desc.Parent and desc.Parent:IsA("Accessory")) then
				desc.Transparency = 0
			else
				desc.Transparency = 0
			end
		end
		if desc:IsA("PointLight") and desc.Name == "SpectatorLight" then
			desc:Destroy()
		end
	end

	local tag = character:FindFirstChild("SpectatorTag")
	if tag then
		tag:Destroy()
	end

	local humanoid = character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.WalkSpeed = 16
	end

	setCharacterCollisionGroup(character, DEFAULT_GROUP)
end

----------------------------------------------------------------------
-- Enter / Exit
----------------------------------------------------------------------

local function enterSpectator(player: Player, mapName: string?)
	spectators[player] = true
	local map = mapName or "Lobby"
	applyGhostEffect(player)
	teleportToPlatform(player, map)
	SpectatorMode:FireClient(player, true)
	print("[SpectatorSystem] Enter:", player.Name, "map=", map)
end

local function exitSpectator(player: Player)
	spectators[player] = nil
	clearGhostEffect(player)
	SpectatorMode:FireClient(player, false)
	print("[SpectatorSystem] Exit:", player.Name)
end

local function exitAll()
	for player in pairs(spectators) do
		exitSpectator(player)
	end
	table.clear(spectators)
end

local function relocateAll(mapName: string)
	getOrCreatePlatform(mapName)
	for player in pairs(spectators) do
		if player.Parent == Players then
			teleportToPlatform(player, mapName)
		end
	end
end

----------------------------------------------------------------------
-- Bridges
----------------------------------------------------------------------

local spectatorBridge = Instance.new("BindableEvent")
spectatorBridge.Name = "SpectatorBridge"
spectatorBridge.Parent = ServerScriptService

spectatorBridge.Event:Connect(function(action: string, ...: any)
	if action == "enter" then
		local player, mapName = ...
		if typeof(player) == "Instance" and player:IsA("Player") then
			enterSpectator(player, typeof(mapName) == "string" and mapName or nil)
		end
	elseif action == "exit" then
		local player = ...
		if typeof(player) == "Instance" and player:IsA("Player") then
			exitSpectator(player)
		end
	elseif action == "exitAll" then
		exitAll()
	elseif action == "relocate" then
		local mapName = ...
		if typeof(mapName) == "string" then
			relocateAll(mapName)
		end
	end
end)

-- Optional EliminationBridge for other scripts
local eliminationBridge = Instance.new("BindableEvent")
eliminationBridge.Name = "EliminationBridge"
eliminationBridge.Parent = ServerScriptService

eliminationBridge.Event:Connect(function(action: string, player: Player, reason: string?)
	if action == "eliminate" and typeof(player) == "Instance" and player:IsA("Player") then
		local handler = require(ServerScriptService:WaitForChild("EliminationHandler"))
		handler.EliminatePlayer(player, reason or "Could not adapt in time")
	end
end)

----------------------------------------------------------------------
-- Relocate on RoundStarted / restore on GameOver
----------------------------------------------------------------------

RoundStarted.OnServerEvent:Connect(function()
	-- Clients shouldn't fire this; ignore.
end)

-- Listen via our bindable from RoundSystem
local function hookRoundStartedBindable()
	local be = ServerScriptService:WaitForChild("RoundStartedBindable", 30)
	if be and be:IsA("BindableEvent") then
		be.Event:Connect(function(payload)
			if typeof(payload) == "table" and typeof(payload.mapName) == "string" then
				relocateAll(payload.mapName)
			end
		end)
	end
end

task.spawn(hookRoundStartedBindable)

GameOverEvent.OnServerEvent:Connect(function()
	-- ignore client
end)

-- Pre-create platforms for known maps
for _, mapName in ipairs({ "Lobby", "Map_Platform", "Map_Button", "Map_Chase", "Map_Coins", "Map_Swap" }) do
	task.defer(getOrCreatePlatform, mapName)
end

-- If spectator respawns, re-apply ghost
Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function()
		if spectators[player] then
			task.wait(0.3)
			applyGhostEffect(player)
			teleportToPlatform(player, "Lobby")
		end
	end)
end)

Players.PlayerRemoving:Connect(function(player)
	spectators[player] = nil
end)

print("[SpectatorSystem] Ready")
