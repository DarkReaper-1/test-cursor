--[[
	PlatformKill (Script — parent under Map_Platform.SafePlatform)
	SERVER ONLY: green "SafePlatform" is the LIE — it kills on touch.
	Reason: "Touched the wrong platform". 0.5s debounce.
]]

local Players = game:GetService("Players")
local ServerScriptService = game:GetService("ServerScriptService")

local EliminationHandler = require(ServerScriptService:WaitForChild("EliminationHandler"))

local DEBOUNCE = 0.5
local debounceMap: { [Player]: number } = {}

local function findSafePlatform(): BasePart?
	local maps = workspace:FindFirstChild("Maps")
	local map = maps and maps:FindFirstChild("Map_Platform")
	if map then
		local p = map:FindFirstChild("SafePlatform", true)
		if p and p:IsA("BasePart") then
			return p
		end
	end
	if script.Parent and script.Parent:IsA("BasePart") and script.Parent.Name == "SafePlatform" then
		return script.Parent
	end
	return nil
end

local function hook(platform: BasePart)
	platform.Touched:Connect(function(hit)
		local character = hit:FindFirstAncestorOfClass("Model")
		if not character then
			return
		end
		if not character:FindFirstChildOfClass("Humanoid") then
			return
		end
		local player = Players:GetPlayerFromCharacter(character)
		if not player then
			return
		end
		if EliminationHandler.CurrentMapName ~= "Map_Platform" then
			return
		end
		if not EliminationHandler.IsAlive(player) then
			return
		end

		local now = os.clock()
		if debounceMap[player] and (now - debounceMap[player]) < DEBOUNCE then
			return
		end
		debounceMap[player] = now

		EliminationHandler.EliminatePlayer(player, "Touched the wrong platform")
	end)
	print("[PlatformKill] Hooked", platform:GetFullName())
end

task.spawn(function()
	local platform = findSafePlatform()
	local tries = 0
	while not platform and tries < 60 do
		task.wait(1)
		tries += 1
		platform = findSafePlatform()
	end
	if platform then
		hook(platform)
	else
		warn("[PlatformKill] SafePlatform not found — run MapBuilder")
	end
end)

Players.PlayerRemoving:Connect(function(player)
	debounceMap[player] = nil
end)
