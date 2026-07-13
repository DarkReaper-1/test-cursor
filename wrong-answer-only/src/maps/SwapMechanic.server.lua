--[[
	SwapMechanic (Script — parent under Map_Swap)
	safeZone starts "BLUE". Kill logic reads the variable (never hardcoded).
	TweenService color pulse on both zones. At 20s and 40s: warning, flash,
	grace period, then swap. Reason: "Could not adapt in time". Reset on RoundEnded.
]]

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local EliminationHandler = require(ServerScriptService:WaitForChild("EliminationHandler"))

local GameEvents = ReplicatedStorage:WaitForChild("GameEvents")
local RuleReveal = GameEvents:WaitForChild("RuleReveal") :: RemoteEvent

local DEBOUNCE = 0.5
local debounceMap: { [Player]: number } = {}

local safeZone = "BLUE" -- "RED" or "BLUE"
local killsEnabled = true
local active = false

local redZone: BasePart? = nil
local blueZone: BasePart? = nil
local redTween: Tween? = nil
local blueTween: Tween? = nil
local touchConns: { RBXScriptConnection } = {}
local scheduleThread: thread? = nil

local RED_COLOR = Color3.fromRGB(220, 40, 40)
local BLUE_COLOR = Color3.fromRGB(40, 100, 255)
local RED_DIM = Color3.fromRGB(120, 20, 20)
local BLUE_DIM = Color3.fromRGB(20, 50, 140)

local function findMap(): Instance?
	local maps = workspace:FindFirstChild("Maps")
	return maps and maps:FindFirstChild("Map_Swap")
end

local function cacheZones()
	local map = findMap()
	if not map then
		return
	end
	local r = map:FindFirstChild("RedZone", true)
	local b = map:FindFirstChild("BlueZone", true)
	if r and r:IsA("BasePart") then
		redZone = r
	end
	if b and b:IsA("BasePart") then
		blueZone = b
	end
end

local function stopPulses()
	if redTween then
		redTween:Cancel()
		redTween = nil
	end
	if blueTween then
		blueTween:Cancel()
		blueTween = nil
	end
end

local function startPulses()
	stopPulses()
	if redZone then
		redZone.Color = RED_COLOR
		local info = TweenInfo.new(1.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true)
		redTween = TweenService:Create(redZone, info, { Color = RED_DIM })
		redTween:Play()
	end
	if blueZone then
		blueZone.Color = BLUE_COLOR
		local info = TweenInfo.new(1.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true)
		blueTween = TweenService:Create(blueZone, info, { Color = BLUE_DIM })
		blueTween:Play()
	end
end

local function flashZonesWhite(times: number)
	task.spawn(function()
		for _ = 1, times do
			if redZone then
				redZone.Color = Color3.new(1, 1, 1)
			end
			if blueZone then
				blueZone.Color = Color3.new(1, 1, 1)
			end
			task.wait(0.2)
			if redZone then
				redZone.Color = RED_COLOR
			end
			if blueZone then
				blueZone.Color = BLUE_COLOR
			end
			task.wait(0.2)
		end
		startPulses()
	end)
end

local function checkPlayerZone(player: Player)
	if not active or not killsEnabled then
		return
	end
	if not EliminationHandler.IsAlive(player) then
		return
	end
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if not (hrp and hrp:IsA("BasePart")) then
		return
	end

	local pos = hrp.Position
	local inRed = false
	local inBlue = false

	if redZone then
		local rel = redZone.CFrame:PointToObjectSpace(pos)
		local half = redZone.Size * 0.5
		inRed = math.abs(rel.X) <= half.X and math.abs(rel.Y) <= half.Y + 4 and math.abs(rel.Z) <= half.Z
	end
	if blueZone then
		local rel = blueZone.CFrame:PointToObjectSpace(pos)
		local half = blueZone.Size * 0.5
		inBlue = math.abs(rel.X) <= half.X and math.abs(rel.Y) <= half.Y + 4 and math.abs(rel.Z) <= half.Z
	end

	-- If player is in the UNSAFE zone, eliminate
	local unsafe = if safeZone == "BLUE" then inRed else inBlue
	-- Also: standing on neither during active kill phase after swap? Spec focuses on wrong zone.
	if unsafe then
		local now = os.clock()
		if debounceMap[player] and (now - debounceMap[player]) < DEBOUNCE then
			return
		end
		debounceMap[player] = now
		EliminationHandler.EliminatePlayer(player, "Could not adapt in time")
	end
end

local function onZoneTouched(zoneName: string, hit: BasePart)
	if not active or not killsEnabled then
		return
	end
	if EliminationHandler.CurrentMapName ~= "Map_Swap" then
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

	-- Kill if this zone is NOT the current safe zone
	if zoneName ~= safeZone then
		local now = os.clock()
		if debounceMap[player] and (now - debounceMap[player]) < DEBOUNCE then
			return
		end
		debounceMap[player] = now
		EliminationHandler.EliminatePlayer(player, "Could not adapt in time")
	end
end

local function disconnectTouches()
	for _, c in ipairs(touchConns) do
		c:Disconnect()
	end
	table.clear(touchConns)
end

local function wireTouches()
	disconnectTouches()
	if redZone then
		table.insert(touchConns, redZone.Touched:Connect(function(hit)
			onZoneTouched("RED", hit)
		end))
	end
	if blueZone then
		table.insert(touchConns, blueZone.Touched:Connect(function(hit)
			onZoneTouched("BLUE", hit)
		end))
	end
end

local function performSwap(graceSeconds: number, warningText: string)
	RuleReveal:FireAllClients(warningText, 5, "ZONE SWAP")
	flashZonesWhite(3)
	killsEnabled = false
	task.wait(graceSeconds)
	if not active then
		return
	end
	-- Swap
	safeZone = if safeZone == "BLUE" then "RED" else "BLUE"
	killsEnabled = true
	print("[SwapMechanic] Safe zone is now", safeZone)

	-- Immediately check everyone standing in the wrong zone
	for _, player in ipairs(EliminationHandler.GetAlivePlayers()) do
		checkPlayerZone(player)
	end
end

local function stopRound()
	active = false
	killsEnabled = true
	safeZone = "BLUE"
	disconnectTouches()
	stopPulses()
	if redZone then
		redZone.Color = RED_COLOR
	end
	if blueZone then
		blueZone.Color = BLUE_COLOR
	end
	scheduleThread = nil
end

local function startRound()
	stopRound()
	cacheZones()
	safeZone = "BLUE"
	killsEnabled = true
	active = true
	wireTouches()
	startPulses()

	scheduleThread = task.spawn(function()
		-- At 20s: warning + flash + 5s grace + swap
		task.wait(20)
		if not active then
			return
		end
		performSwap(5, "⚠️ ZONES SWAPPING — MOVE NOW!")

		-- At 40s absolute (20s after first swap start… first wait was 20, grace 5, so need 15 more to hit ~40)
		-- Spec: at 40s same with 3s grace. From round start: wait until t=40.
		-- We've waited 20 + 5 grace = 25 elapsed. Wait 15 more → t=40.
		task.wait(15)
		if not active then
			return
		end
		performSwap(3, "⚠️ ZONES SWAPPING AGAIN!")
	end)

	print("[SwapMechanic] Round started — safe zone BLUE")
end

task.spawn(function()
	cacheZones()
	local be = ServerScriptService:WaitForChild("RoundStartedBindable", 60)
	if be and be:IsA("BindableEvent") then
		be.Event:Connect(function(payload)
			if typeof(payload) == "table" and payload.mapName == "Map_Swap" then
				startRound()
			end
		end)
	end
	local ended = ServerScriptService:WaitForChild("RoundEndedBindable", 60)
	if ended and ended:IsA("BindableEvent") then
		ended.Event:Connect(function(payload)
			if typeof(payload) == "table" and (payload.mapName == "Map_Swap" or active) then
				stopRound()
			end
		end)
	end
end)

Players.PlayerRemoving:Connect(function(player)
	debounceMap[player] = nil
end)

print("[SwapMechanic] Loaded")
