--[[
	CoinMechanic (Script — parent under Map_Coins)
	Heartbeat rotates all coins. Hitbox Touched → "Collected a forbidden coin".
	Every 8s spawn 5 new coins (with hitboxes). 45s survivors win.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ServerScriptService = game:GetService("ServerScriptService")
local Debris = game:GetService("Debris")

local EliminationHandler = require(ServerScriptService:WaitForChild("EliminationHandler"))

local DEBOUNCE = 0.5
local debounceMap: { [Player]: number } = {}

local active = false
local coinsFolder: Folder? = nil
local heartbeatConn: RBXScriptConnection? = nil
local spawnThread: thread? = nil

local function findMap(): Instance?
	local maps = workspace:FindFirstChild("Maps")
	return maps and maps:FindFirstChild("Map_Coins")
end

local function wireHitbox(hitbox: BasePart)
	hitbox.Touched:Connect(function(hit)
		if not active then
			return
		end
		if EliminationHandler.CurrentMapName ~= "Map_Coins" then
			return
		end
		local character = hit:FindFirstAncestorOfClass("Model")
		if not character then
			return
		end
		local player = Players:GetPlayerFromCharacter(character)
		if not player or not EliminationHandler.IsAlive(player) then
			return
		end
		local now = os.clock()
		if debounceMap[player] and (now - debounceMap[player]) < DEBOUNCE then
			return
		end
		debounceMap[player] = now
		EliminationHandler.EliminatePlayer(player, "Collected a forbidden coin")
	end)
end

local function createCoin(position: Vector3)
	local map = findMap()
	if not map then
		return
	end
	if not coinsFolder or not coinsFolder.Parent then
		coinsFolder = map:FindFirstChild("Coins") :: Folder?
		if not coinsFolder then
			coinsFolder = Instance.new("Folder")
			coinsFolder.Name = "Coins"
			coinsFolder.Parent = map
		end
	end

	local coin = Instance.new("Part")
	coin.Name = "Coin"
	coin.Shape = Enum.PartType.Cylinder
	coin.Size = Vector3.new(1, 3, 3) -- Cylinder: X is height axis in Roblox
	-- Spec: 3x1x3 cylinder — use Size Vector3.new(1, 3, 3) then orient
	coin.Size = Vector3.new(1, 3, 3)
	coin.CFrame = CFrame.new(position) * CFrame.Angles(0, 0, math.rad(90))
	coin.Anchored = true
	coin.CanCollide = false
	coin.Material = Enum.Material.Neon
	coin.Color = Color3.fromRGB(255, 200, 0)
	coin.Parent = coinsFolder

	local hitbox = Instance.new("Part")
	hitbox.Name = "CoinHitbox"
	hitbox.Size = Vector3.new(4, 4, 4)
	hitbox.CFrame = CFrame.new(position)
	hitbox.Anchored = true
	hitbox.CanCollide = false
	hitbox.Transparency = 1
	hitbox.Parent = coin
	wireHitbox(hitbox)

	return coin
end

local function wireExistingCoins()
	local map = findMap()
	if not map then
		return
	end
	coinsFolder = map:FindFirstChild("Coins") :: Folder?
	local root = coinsFolder or map
	for _, desc in ipairs(root:GetDescendants()) do
		if desc:IsA("BasePart") and desc.Name == "CoinHitbox" then
			wireHitbox(desc)
		elseif desc:IsA("BasePart") and desc.Name == "Coin" then
			-- Ensure hitbox exists
			local hb = desc:FindFirstChild("CoinHitbox")
			if not hb then
				local hitbox = Instance.new("Part")
				hitbox.Name = "CoinHitbox"
				hitbox.Size = Vector3.new(4, 4, 4)
				hitbox.CFrame = CFrame.new(desc.Position)
				hitbox.Anchored = true
				hitbox.CanCollide = false
				hitbox.Transparency = 1
				hitbox.Parent = desc
				wireHitbox(hitbox)
			end
		end
	end
end

local function stopCoins()
	active = false
	if heartbeatConn then
		heartbeatConn:Disconnect()
		heartbeatConn = nil
	end
	spawnThread = nil
end

local function startCoins()
	stopCoins()
	active = true
	wireExistingCoins()

	heartbeatConn = RunService.Heartbeat:Connect(function(dt)
		if not active then
			return
		end
		local map = findMap()
		if not map then
			return
		end
		local folder = map:FindFirstChild("Coins")
		local root = folder or map
		for _, desc in ipairs(root:GetDescendants()) do
			if desc:IsA("BasePart") and desc.Name == "Coin" then
				desc.CFrame = desc.CFrame * CFrame.Angles(0, dt * 2, 0)
				local hb = desc:FindFirstChild("CoinHitbox")
				if hb and hb:IsA("BasePart") then
					hb.CFrame = CFrame.new(desc.Position)
				end
			end
		end
	end)

	spawnThread = task.spawn(function()
		while active do
			task.wait(8)
			if not active then
				break
			end
			for _ = 1, 5 do
				local angle = math.random() * math.pi * 2
				local radius = math.random() * 50
				local x = math.cos(angle) * radius
				local z = 1200 + math.sin(angle) * radius
				local y = 2 + math.random() * 4
				createCoin(Vector3.new(x, y, z))
			end
			print("[CoinMechanic] Spawned 5 new trap coins")
		end
	end)

	print("[CoinMechanic] Round active")
end

task.spawn(function()
	local be = ServerScriptService:WaitForChild("RoundStartedBindable", 60)
	if be and be:IsA("BindableEvent") then
		be.Event:Connect(function(payload)
			if typeof(payload) == "table" and payload.mapName == "Map_Coins" then
				startCoins()
			end
		end)
	end
	local ended = ServerScriptService:WaitForChild("RoundEndedBindable", 60)
	if ended and ended:IsA("BindableEvent") then
		ended.Event:Connect(function()
			if active then
				stopCoins()
			end
		end)
	end
end)

Players.PlayerRemoving:Connect(function(player)
	debounceMap[player] = nil
end)

print("[CoinMechanic] Loaded")
