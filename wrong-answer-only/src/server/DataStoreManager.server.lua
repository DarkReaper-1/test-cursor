--[[
	DataStoreManager (Script — ServerScriptService)
	Persists player stats and a global wins OrderedDataStore leaderboard.
	Every DataStore call is wrapped in pcall. Exposes BindableFunction
	"DataStoreBridge" for GameManager / RoundSystem.
]]

local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local GameEvents = ReplicatedStorage:WaitForChild("GameEvents")
local UpdateLeaderboard = GameEvents:WaitForChild("UpdateLeaderboard") :: RemoteEvent

local PLAYER_STORE_NAME = "WrongAnswerOnly_PlayerData_v1"
local WINS_STORE_NAME = "WrongAnswerOnly_Wins_v1"

local playerStore = DataStoreService:GetDataStore(PLAYER_STORE_NAME)
local winsStore = DataStoreService:GetOrderedDataStore(WINS_STORE_NAME)

export type PlayerData = {
	TotalWins: number,
	TotalGamesPlayed: number,
	TotalRoundsSurvived: number,
	LongestWinStreak: number,
	CurrentWinStreak: number,
}

local DEFAULT_DATA: PlayerData = {
	TotalWins = 0,
	TotalGamesPlayed = 0,
	TotalRoundsSurvived = 0,
	LongestWinStreak = 0,
	CurrentWinStreak = 0,
}

-- In-memory cache
local cache: { [number]: PlayerData } = {} -- UserId → data
local dirty: { [number]: boolean } = {}
local lastSave: { [number]: number } = {} -- debounce timestamps
local SAVE_DEBOUNCE = 10
local AUTOSAVE_INTERVAL = 60

local function cloneDefaults(): PlayerData
	return {
		TotalWins = 0,
		TotalGamesPlayed = 0,
		TotalRoundsSurvived = 0,
		LongestWinStreak = 0,
		CurrentWinStreak = 0,
	}
end

local function sanitize(raw: any): PlayerData
	local data = cloneDefaults()
	if typeof(raw) ~= "table" then
		return data
	end
	for key in pairs(data) do
		if typeof(raw[key]) == "number" then
			data[key] = math.max(0, math.floor(raw[key]))
		end
	end
	return data
end

----------------------------------------------------------------------
-- Load / Save
----------------------------------------------------------------------

local function loadPlayer(player: Player)
	local key = tostring(player.UserId)
	local ok, result = pcall(function()
		return playerStore:GetAsync(key)
	end)
	if ok then
		cache[player.UserId] = sanitize(result)
	else
		warn("[DataStoreManager] Load failed for", player.Name, result)
		cache[player.UserId] = cloneDefaults()
	end
	dirty[player.UserId] = false
	print(string.format("[DataStoreManager] Loaded %s — wins=%d", player.Name, cache[player.UserId].TotalWins))
end

local function savePlayer(userId: number, force: boolean?)
	local data = cache[userId]
	if not data then
		return
	end
	if not dirty[userId] and not force then
		return
	end

	local now = os.clock()
	if not force and lastSave[userId] and (now - lastSave[userId]) < SAVE_DEBOUNCE then
		return
	end

	local key = tostring(userId)
	local ok, err = pcall(function()
		playerStore:SetAsync(key, data)
	end)
	if ok then
		dirty[userId] = false
		lastSave[userId] = now
	else
		warn("[DataStoreManager] Save failed for", userId, err)
	end
end

local function saveAll(force: boolean?)
	for userId in pairs(cache) do
		savePlayer(userId, force)
	end
end

----------------------------------------------------------------------
-- Leaderboard
----------------------------------------------------------------------

local function fetchLeaderboard(): { { name: string, userId: number, wins: number } }
	local entries = {}
	local ok, pages = pcall(function()
		return winsStore:GetSortedAsync(false, 5)
	end)
	if not ok or not pages then
		warn("[DataStoreManager] FetchLeaderboard failed:", pages)
		return entries
	end

	local pageOk, page = pcall(function()
		return pages:GetCurrentPage()
	end)
	if not pageOk or typeof(page) ~= "table" then
		return entries
	end

	for _, item in ipairs(page) do
		local userId = tonumber(item.key)
		local wins = item.value
		local name = "Player"
		if userId then
			local nameOk, result = pcall(function()
				return Players:GetNameFromUserIdAsync(userId)
			end)
			if nameOk and typeof(result) == "string" then
				name = result
			end
			-- Prefer live player display name
			local live = Players:GetPlayerByUserId(userId)
			if live then
				name = live.DisplayName
			end
		end
		table.insert(entries, {
			name = name,
			userId = userId or 0,
			wins = typeof(wins) == "number" and wins or 0,
		})
	end
	return entries
end

local function publishLeaderboard()
	local top = fetchLeaderboard()
	UpdateLeaderboard:FireAllClients(top)
end

local function recordWinToOrdered(player: Player, totalWins: number)
	local ok, err = pcall(function()
		winsStore:SetAsync(tostring(player.UserId), totalWins)
	end)
	if not ok then
		warn("[DataStoreManager] Ordered wins update failed:", err)
	end
end

----------------------------------------------------------------------
-- Bridge API
----------------------------------------------------------------------

local bridge = Instance.new("BindableFunction")
bridge.Name = "DataStoreBridge"
bridge.Parent = ServerScriptService

bridge.OnInvoke = function(action: string, ...: any): any
	if action == "RecordWin" then
		local player = ...
		if typeof(player) ~= "Instance" or not player:IsA("Player") then
			return false
		end
		local data = cache[player.UserId] or cloneDefaults()
		cache[player.UserId] = data
		data.TotalWins += 1
		data.CurrentWinStreak += 1
		if data.CurrentWinStreak > data.LongestWinStreak then
			data.LongestWinStreak = data.CurrentWinStreak
		end
		dirty[player.UserId] = true
		recordWinToOrdered(player, data.TotalWins)
		savePlayer(player.UserId, true)
		publishLeaderboard()
		return true
	elseif action == "RecordGamePlayed" then
		-- Increment for every currently cached / present player
		local playerArg = ...
		if typeof(playerArg) == "Instance" and playerArg:IsA("Player") then
			local data = cache[playerArg.UserId] or cloneDefaults()
			cache[playerArg.UserId] = data
			data.TotalGamesPlayed += 1
			dirty[playerArg.UserId] = true
		else
			for _, player in ipairs(Players:GetPlayers()) do
				local data = cache[player.UserId] or cloneDefaults()
				cache[player.UserId] = data
				data.TotalGamesPlayed += 1
				dirty[player.UserId] = true
			end
		end
		return true
	elseif action == "RecordRoundSurvived" then
		local player = ...
		if typeof(player) ~= "Instance" or not player:IsA("Player") then
			return false
		end
		local data = cache[player.UserId] or cloneDefaults()
		cache[player.UserId] = data
		data.TotalRoundsSurvived += 1
		dirty[player.UserId] = true
		return true
	elseif action == "GetData" then
		local player = ...
		if typeof(player) ~= "Instance" or not player:IsA("Player") then
			return cloneDefaults()
		end
		return cache[player.UserId] or cloneDefaults()
	elseif action == "SaveAll" then
		saveAll(true)
		return true
	elseif action == "FetchLeaderboard" then
		local top = fetchLeaderboard()
		UpdateLeaderboard:FireAllClients(top)
		return top
	end
	warn("[DataStoreManager] Unknown bridge action:", action)
	return nil
end

----------------------------------------------------------------------
-- Lifecycle
----------------------------------------------------------------------

Players.PlayerAdded:Connect(function(player)
	loadPlayer(player)
	-- Push leaderboard to new joiner shortly after
	task.delay(2, function()
		if player.Parent then
			local top = fetchLeaderboard()
			UpdateLeaderboard:FireClient(player, top)
		end
	end)
end)

Players.PlayerRemoving:Connect(function(player)
	-- Reset streak if they didn't just win (streak only grows on RecordWin)
	-- Leaving doesn't clear streak mid-session cache — save what we have
	savePlayer(player.UserId, true)
	cache[player.UserId] = nil
	dirty[player.UserId] = nil
	lastSave[player.UserId] = nil
end)

game:BindToClose(function()
	saveAll(true)
	task.wait(2) -- give DataStores a moment in Studio/live
end)

-- Autosave loop
task.spawn(function()
	while true do
		task.wait(AUTOSAVE_INTERVAL)
		saveAll(false)
	end
end)

-- Load anyone already present (Studio play-solo race)
for _, player in ipairs(Players:GetPlayers()) do
	task.spawn(loadPlayer, player)
end

print("[DataStoreManager] Ready — bridge online")
