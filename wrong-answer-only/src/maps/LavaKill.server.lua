--[[
	LavaKill (Script — parent under Map_Platform.LavaFloor, or Maps.MapScripts)
	SERVER ONLY: touching LavaFloor eliminates with "Fell out of bounds".
	0.5s debounce per player. Never trusts the client.
]]

local Players = game:GetService("Players")
local ServerScriptService = game:GetService("ServerScriptService")

local EliminationHandler = require(ServerScriptService:WaitForChild("EliminationHandler"))

local DEBOUNCE = 0.5
local debounceMap: { [Player]: number } = {}

local function findLava(): BasePart?
	local maps = workspace:FindFirstChild("Maps")
	local map = maps and maps:FindFirstChild("Map_Platform")
	if not map then
		return nil
	end
	local lava = map:FindFirstChild("LavaFloor", true)
	if lava and lava:IsA("BasePart") then
		return lava
	end
	-- Fallback: script parent
	if script.Parent and script.Parent:IsA("BasePart") and script.Parent.Name == "LavaFloor" then
		return script.Parent
	end
	return nil
end

local function hook(lava: BasePart)
	lava.Touched:Connect(function(hit)
		local character = hit:FindFirstAncestorOfClass("Model")
		if not character then
			return
		end
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if not humanoid then
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

		EliminationHandler.EliminatePlayer(player, "Fell out of bounds")
	end)
	print("[LavaKill] Hooked", lava:GetFullName())
end

task.spawn(function()
	local lava = findLava()
	local tries = 0
	while not lava and tries < 60 do
		task.wait(1)
		tries += 1
		lava = findLava()
	end
	if lava then
		hook(lava)
	else
		warn("[LavaKill] LavaFloor not found — run MapBuilder")
	end
end)

Players.PlayerRemoving:Connect(function(player)
	debounceMap[player] = nil
end)
