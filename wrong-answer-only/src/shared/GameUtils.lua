--[[
	GameUtils (ModuleScript — ReplicatedStorage)
	Shared helpers for server and client. Server-only functions are gated with
	RunService:IsServer() so requiring this on the client is always safe.
]]

local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local TextChatService = game:GetService("TextChatService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local GameUtils = {}

-- Cached original transparencies for HideAllMaps / ShowMap
local transparencyCache: { [BasePart]: number } = {}
local canCollideCache: { [BasePart]: boolean } = {}

----------------------------------------------------------------------
-- ShuffleTable — Fisher-Yates, returns a shuffled COPY (original untouched)
----------------------------------------------------------------------
function GameUtils.ShuffleTable(t: { any }): { any }
	local copy = table.clone(t)
	for i = #copy, 2, -1 do
		local j = math.random(1, i)
		copy[i], copy[j] = copy[j], copy[i]
	end
	return copy
end

----------------------------------------------------------------------
-- GetAlivePlayers — server reads EliminationHandler; client returns all players
----------------------------------------------------------------------
function GameUtils.GetAlivePlayers(): { Player }
	if RunService:IsServer() then
		local SSS = game:GetService("ServerScriptService")
		local handler = SSS:FindFirstChild("EliminationHandler")
		if handler then
			local ok, mod = pcall(require, handler)
			if ok and mod and typeof(mod.GetAlivePlayers) == "function" then
				return mod.GetAlivePlayers()
			end
		end
	end
	-- Client fallback (or handler missing): every player currently in game
	return Players:GetPlayers()
end

----------------------------------------------------------------------
-- FormatTime — "1:30" style
----------------------------------------------------------------------
function GameUtils.FormatTime(seconds: number): string
	seconds = math.max(0, math.floor(seconds + 0.5))
	local mins = math.floor(seconds / 60)
	local secs = seconds % 60
	return string.format("%d:%02d", mins, secs)
end

----------------------------------------------------------------------
-- AnnounceToAll — TextChatService with Chat fallback, everything in pcall
----------------------------------------------------------------------
function GameUtils.AnnounceToAll(message: string, color: Color3?)
	color = color or Color3.fromRGB(255, 255, 255)

	pcall(function()
		local channels = TextChatService:FindFirstChild("TextChannels")
		if channels then
			local general = channels:FindFirstChild("RBXGeneral")
			if general and general:IsA("TextChannel") then
				general:DisplaySystemMessage(message)
				return
			end
		end
	end)

	-- Legacy Chat fallback
	pcall(function()
		local StarterGui = game:GetService("StarterGui")
		StarterGui:SetCore("ChatMakeSystemMessage", {
			Text = message,
			Color = color,
			Font = Enum.Font.GothamBold,
			TextSize = 18,
		})
	end)
end

----------------------------------------------------------------------
-- GetMapCenter — bounding box with part-average fallback
----------------------------------------------------------------------
function GameUtils.GetMapCenter(mapName: string): Vector3
	local maps = workspace:FindFirstChild("Maps")
	if not maps then
		return Vector3.new(0, 1, 0)
	end
	local mapModel = maps:FindFirstChild(mapName)
	if not mapModel then
		-- Known centers from MapBuilder layout
		local known = {
			Lobby = Vector3.new(0, 1, 0),
			Map_Platform = Vector3.new(0, 1, 300),
			Map_Button = Vector3.new(0, 1, 600),
			Map_Chase = Vector3.new(0, 1, 900),
			Map_Coins = Vector3.new(0, 1, 1200),
			Map_Swap = Vector3.new(0, 1, 1500),
		}
		return known[mapName] or Vector3.new(0, 1, 0)
	end

	if mapModel:IsA("Model") then
		local ok, cf = pcall(function()
			return mapModel:GetBoundingBox()
		end)
		if ok and typeof(cf) == "CFrame" then
			return cf.Position
		end
	end

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

----------------------------------------------------------------------
-- TeleportToMap — shuffled SpawnLocations, unique spots, +4Y offset
----------------------------------------------------------------------
function GameUtils.TeleportToMap(players: { Player }, mapName: string)
	if not RunService:IsServer() then
		warn("[GameUtils] TeleportToMap is server-only")
		return
	end

	local maps = workspace:FindFirstChild("Maps")
	if not maps then
		warn("[GameUtils] Maps folder missing")
		return
	end
	local mapModel = maps:FindFirstChild(mapName)
	if not mapModel then
		warn("[GameUtils] Map not found:", mapName)
		return
	end

	local spawns: { SpawnLocation } = {}
	for _, child in ipairs(mapModel:GetDescendants()) do
		if child:IsA("SpawnLocation") then
			table.insert(spawns, child)
		end
	end

	if #spawns == 0 then
		-- Fallback: drop near map center
		local center = GameUtils.GetMapCenter(mapName)
		for _, player in ipairs(players) do
			local char = player.Character
			local hrp = char and char:FindFirstChild("HumanoidRootPart")
			if hrp and hrp:IsA("BasePart") then
				hrp.CFrame = CFrame.new(center + Vector3.new(0, 6, 0))
			end
		end
		return
	end

	local shuffled = GameUtils.ShuffleTable(spawns)
	for i, player in ipairs(players) do
		local spawnPart = shuffled[((i - 1) % #shuffled) + 1]
		local char = player.Character
		-- Wait briefly for character if needed
		if not char then
			char = player.CharacterAdded:Wait()
		end
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if not hrp then
			hrp = char:WaitForChild("HumanoidRootPart", 5)
		end
		if hrp and hrp:IsA("BasePart") then
			hrp.CFrame = spawnPart.CFrame + Vector3.new(0, 4, 0)
		end
	end
end

----------------------------------------------------------------------
-- HideAllMaps / ShowMap — cache & restore transparencies
----------------------------------------------------------------------
local function cacheAndHide(part: BasePart)
	if transparencyCache[part] == nil then
		transparencyCache[part] = part.Transparency
		canCollideCache[part] = part.CanCollide
	end
	part.Transparency = 1
	part.CanCollide = false
end

local function restorePart(part: BasePart)
	if transparencyCache[part] ~= nil then
		part.Transparency = transparencyCache[part]
		part.CanCollide = canCollideCache[part] == true
	end
end

function GameUtils.HideAllMaps()
	if not RunService:IsServer() then
		return
	end
	local maps = workspace:FindFirstChild("Maps")
	if not maps then
		return
	end
	for _, mapModel in ipairs(maps:GetChildren()) do
		if mapModel:IsA("Model") or mapModel:IsA("Folder") then
			-- Keep MapScripts folder alone
			if mapModel.Name ~= "MapScripts" then
				for _, desc in ipairs(mapModel:GetDescendants()) do
					if desc:IsA("BasePart") then
						cacheAndHide(desc)
					end
				end
			end
		end
	end
end

function GameUtils.ShowMap(mapName: string)
	if not RunService:IsServer() then
		return
	end
	local maps = workspace:FindFirstChild("Maps")
	if not maps then
		return
	end

	-- Hide everything first, then restore the requested map
	GameUtils.HideAllMaps()

	local mapModel = maps:FindFirstChild(mapName)
	if not mapModel then
		warn("[GameUtils] ShowMap: missing", mapName)
		return
	end
	for _, desc in ipairs(mapModel:GetDescendants()) do
		if desc:IsA("BasePart") then
			restorePart(desc)
		end
	end
end

----------------------------------------------------------------------
-- WaitForPlayers — yield until minimum players are present (poll 2s)
----------------------------------------------------------------------
function GameUtils.WaitForPlayers(minimum: number)
	if not RunService:IsServer() then
		return
	end
	while #Players:GetPlayers() < minimum do
		task.wait(2)
	end
end

return GameUtils
