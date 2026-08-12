--[[
	ChaseMechanic (Script — parent under Map_Chase)
	On RoundStarted for Map_Chase: moves finish arch + invisible kill zone
	toward living players at 4 studs/s, +2 every 10s, capped at 20.
	Kill zone Touched → "Ran the wrong direction".
	Survivors at 60s win. Resets arch position each round.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local EliminationHandler = require(ServerScriptService:WaitForChild("EliminationHandler"))

local DEBOUNCE = 0.5
local debounceMap: { [Player]: number } = {}

local BASE_SPEED = 4
local SPEED_STEP = 2
local SPEED_INTERVAL = 10
local SPEED_CAP = 20

-- Cached references + home CFrames for reset
local archParts: { BasePart } = {}
local homeCFrames: { [BasePart]: CFrame } = {}
local killZone: BasePart? = nil
local active = false
local heartbeatConn: RBXScriptConnection? = nil
local killConn: RBXScriptConnection? = nil
local speed = BASE_SPEED
local speedClock = 0

local function findMap(): Instance?
	local maps = workspace:FindFirstChild("Maps")
	return maps and maps:FindFirstChild("Map_Chase")
end

local function cacheArch()
	table.clear(archParts)
	table.clear(homeCFrames)
	killZone = nil

	local map = findMap()
	if not map then
		return
	end

	for _, name in ipairs({ "FinishPillarL", "FinishPillarR", "FinishBar", "FinishArch" }) do
		local part = map:FindFirstChild(name, true)
		if part and part:IsA("BasePart") then
			table.insert(archParts, part)
			homeCFrames[part] = part.CFrame
		end
	end

	-- Also collect any parts tagged with FinishArch folder
	local folder = map:FindFirstChild("FinishArch", true)
	if folder then
		for _, desc in ipairs(folder:GetDescendants()) do
			if desc:IsA("BasePart") and homeCFrames[desc] == nil then
				table.insert(archParts, desc)
				homeCFrames[desc] = desc.CFrame
			end
		end
	end

	local kz = map:FindFirstChild("ArchKillZone", true)
	if kz and kz:IsA("BasePart") then
		killZone = kz
		homeCFrames[kz] = kz.CFrame
		if not table.find(archParts, kz) then
			-- move with arch but already have home
		end
	end
end

local function resetArch()
	for part, cf in pairs(homeCFrames) do
		if part and part.Parent then
			part.CFrame = cf
		end
	end
	speed = BASE_SPEED
	speedClock = 0
end

local function averageAlivePosition(): Vector3?
	local alive = EliminationHandler.GetAlivePlayers()
	if #alive == 0 then
		return nil
	end
	local sum = Vector3.zero
	local count = 0
	for _, player in ipairs(alive) do
		local char = player.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if hrp and hrp:IsA("BasePart") then
			sum += hrp.Position
			count += 1
		end
	end
	if count == 0 then
		return nil
	end
	return sum / count
end

local function stopChase()
	active = false
	if heartbeatConn then
		heartbeatConn:Disconnect()
		heartbeatConn = nil
	end
	if killConn then
		killConn:Disconnect()
		killConn = nil
	end
	resetArch()
end

local function startChase()
	stopChase()
	cacheArch()
	resetArch()
	active = true
	speed = BASE_SPEED
	speedClock = 0

	if killZone then
		local dmap: { [Player]: number } = debounceMap
		killConn = killZone.Touched:Connect(function(hit)
			if not active then
				return
			end
			local character = hit:FindFirstAncestorOfClass("Model")
			if not character then
				return
			end
			local plr = Players:GetPlayerFromCharacter(character)
			if not plr or not EliminationHandler.IsAlive(plr) then
				return
			end
			local now = os.clock()
			if dmap[plr] and (now - dmap[plr]) < DEBOUNCE then
				return
			end
			dmap[plr] = now
			EliminationHandler.EliminatePlayer(plr, "Ran the wrong direction")
		end)
	end

	heartbeatConn = RunService.Heartbeat:Connect(function(dt)
		if not active then
			return
		end
		if EliminationHandler.CurrentMapName ~= "Map_Chase" then
			return
		end

		speedClock += dt
		if speedClock >= SPEED_INTERVAL then
			speedClock = 0
			speed = math.min(SPEED_CAP, speed + SPEED_STEP)
		end

		local target = averageAlivePosition()
		if not target then
			return
		end

		-- Move arch cluster toward players on the X axis primarily (corridor runs along X)
		-- Find cluster centroid
		local centroid = Vector3.zero
		local n = 0
		for _, part in ipairs(archParts) do
			if part.Parent then
				centroid += part.Position
				n += 1
			end
		end
		if killZone and killZone.Parent then
			centroid += killZone.Position
			n += 1
		end
		if n == 0 then
			return
		end
		centroid /= n

		local direction = (target - centroid)
		if direction.Magnitude < 0.05 then
			return
		end
		local step = direction.Unit * math.min(speed * dt, direction.Magnitude)

		for _, part in ipairs(archParts) do
			if part.Parent then
				part.CFrame = part.CFrame + step
			end
		end
		if killZone and killZone.Parent then
			killZone.CFrame = killZone.CFrame + step
		end
	end)

	print("[ChaseMechanic] Chase started — speed", speed)
end

-- Listen for server RoundStarted bindable
task.spawn(function()
	cacheArch()
	local be = ServerScriptService:WaitForChild("RoundStartedBindable", 60)
	if be and be:IsA("BindableEvent") then
		be.Event:Connect(function(payload)
			if typeof(payload) == "table" and payload.mapName == "Map_Chase" then
				startChase()
			end
		end)
	end

	local ended = ServerScriptService:WaitForChild("RoundEndedBindable", 60)
	if ended and ended:IsA("BindableEvent") then
		ended.Event:Connect(function(payload)
			if typeof(payload) == "table" and payload.mapName == "Map_Chase" then
				stopChase()
			elseif active then
				stopChase()
			end
		end)
	end
end)

Players.PlayerRemoving:Connect(function(player)
	debounceMap[player] = nil
end)

print("[ChaseMechanic] Loaded")
