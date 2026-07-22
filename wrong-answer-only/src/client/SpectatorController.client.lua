--[[
	SpectatorController (LocalScript — StarterPlayerScripts)
	Scriptable camera follow of alive players, cycle buttons, ambient wind,
	and spectator-only reaction emojis (client-side billboards — alive never see them).
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local GameEvents = ReplicatedStorage:WaitForChild("GameEvents")
local SpectatorMode = GameEvents:WaitForChild("SpectatorMode") :: RemoteEvent
local PlayerEliminated = GameEvents:WaitForChild("PlayerEliminated") :: RemoteEvent
local RoundStarted = GameEvents:WaitForChild("RoundStarted") :: RemoteEvent
local CountdownTick = GameEvents:WaitForChild("CountdownTick") :: RemoteEvent

local isSpectating = false
local targetPlayer: Player? = nil
local renderConn: RBXScriptConnection? = nil
local camera = workspace.CurrentCamera

local OFFSET = Vector3.new(0, 8, 18)
local LERP_ALPHA = 0.12

----------------------------------------------------------------------
-- UI
----------------------------------------------------------------------

local screen = Instance.new("ScreenGui")
screen.Name = "SpectatorUI"
screen.ResetOnSpawn = false
screen.IgnoreGuiInset = true
screen.Enabled = false
screen.Parent = playerGui

local bottomBar = Instance.new("Frame")
bottomBar.AnchorPoint = Vector2.new(0.5, 1)
bottomBar.Position = UDim2.fromScale(0.5, 0.98)
bottomBar.Size = UDim2.fromScale(0.55, 0.07)
bottomBar.BackgroundColor3 = Color3.fromRGB(25, 10, 40)
bottomBar.BackgroundTransparency = 0.2
bottomBar.Parent = screen
local barCorner = Instance.new("UICorner")
barCorner.CornerRadius = UDim.new(0.25, 0)
barCorner.Parent = bottomBar

local prevBtn = Instance.new("TextButton")
prevBtn.Size = UDim2.fromScale(0.12, 0.8)
prevBtn.Position = UDim2.fromScale(0.02, 0.1)
prevBtn.BackgroundColor3 = Color3.fromRGB(80, 40, 120)
prevBtn.Text = "◀"
prevBtn.TextScaled = true
prevBtn.Font = Enum.Font.GothamBold
prevBtn.TextColor3 = Color3.new(1, 1, 1)
prevBtn.Parent = bottomBar
local pc = Instance.new("UICorner")
pc.CornerRadius = UDim.new(0.2, 0)
pc.Parent = prevBtn

local nextBtn = Instance.new("TextButton")
nextBtn.Size = UDim2.fromScale(0.12, 0.8)
nextBtn.Position = UDim2.fromScale(0.86, 0.1)
nextBtn.BackgroundColor3 = Color3.fromRGB(80, 40, 120)
nextBtn.Text = "▶"
nextBtn.TextScaled = true
nextBtn.Font = Enum.Font.GothamBold
nextBtn.TextColor3 = Color3.new(1, 1, 1)
nextBtn.Parent = bottomBar
local nc = Instance.new("UICorner")
nc.CornerRadius = UDim.new(0.2, 0)
nc.Parent = nextBtn

local specLabel = Instance.new("TextLabel")
specLabel.BackgroundTransparency = 1
specLabel.Position = UDim2.fromScale(0.16, 0.1)
specLabel.Size = UDim2.fromScale(0.68, 0.8)
specLabel.Font = Enum.Font.GothamBold
specLabel.Text = "👻 SPECTATING: —"
specLabel.TextColor3 = Color3.fromRGB(220, 120, 255)
specLabel.TextScaled = true
specLabel.Parent = bottomBar

local overlay = Instance.new("TextLabel")
overlay.AnchorPoint = Vector2.new(0.5, 0)
overlay.Position = UDim2.fromScale(0.5, 0.02)
overlay.Size = UDim2.fromScale(0.35, 0.05)
overlay.BackgroundColor3 = Color3.fromRGB(20, 10, 30)
overlay.BackgroundTransparency = 0.3
overlay.Font = Enum.Font.GothamBold
overlay.Text = "⏱ — | 👤 — alive"
overlay.TextColor3 = Color3.new(1, 1, 1)
overlay.TextScaled = true
overlay.Parent = screen
local oc = Instance.new("UICorner")
oc.CornerRadius = UDim.new(0.3, 0)
oc.Parent = overlay

-- Reaction buttons (spectators only)
local reactions = Instance.new("Frame")
reactions.AnchorPoint = Vector2.new(1, 0.5)
reactions.Position = UDim2.fromScale(0.98, 0.5)
reactions.Size = UDim2.fromScale(0.07, 0.4)
reactions.BackgroundTransparency = 1
reactions.Parent = screen

local reactionEmojis = { "😂", "💀", "👀", "🤦", "🔥" }
local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Vertical
layout.Padding = UDim.new(0.04, 0)
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.Parent = reactions

local function spawnReactionBillboard(emoji: string)
	-- Client-side only — other players (alive) never receive this
	local character = player.Character
	if not character then
		return
	end
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if not hrp then
		return
	end

	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.fromOffset(80, 80)
	billboard.StudsOffset = Vector3.new(0, 3, 0)
	billboard.AlwaysOnTop = true
	billboard.Adornee = hrp
	billboard.Parent = character

	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = UDim2.fromScale(1, 1)
	label.Text = emoji
	label.TextScaled = true
	label.Parent = billboard

	local start = os.clock()
	local conn
	conn = RunService.RenderStepped:Connect(function()
		local t = os.clock() - start
		billboard.StudsOffset = Vector3.new(0, 3 + t * 1.5, 0)
		label.TextTransparency = math.clamp(t / 2, 0, 1)
		if t >= 2 then
			conn:Disconnect()
			billboard:Destroy()
		end
	end)
end

for _, emoji in ipairs(reactionEmojis) do
	local btn = Instance.new("TextButton")
	btn.Size = UDim2.fromScale(1, 0.18)
	btn.BackgroundColor3 = Color3.fromRGB(40, 20, 60)
	btn.Text = emoji
	btn.TextScaled = true
	btn.Parent = reactions
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0.2, 0)
	c.Parent = btn
	btn.MouseButton1Click:Connect(function()
		if isSpectating then
			spawnReactionBillboard(emoji)
		end
	end)
end

----------------------------------------------------------------------
-- Ambient wind
----------------------------------------------------------------------

local wind = Instance.new("Sound")
wind.Name = "SpectatorWind"
wind.SoundId = "rbxasset://sounds/action_footsteps_plastic.mp3" -- soft loop fallback
wind.Looped = true
wind.Volume = 0.15
wind.Parent = SoundService

----------------------------------------------------------------------
-- Target cycling
----------------------------------------------------------------------

local function getAliveCandidates(): { Player }
	local list = {}
	for _, p in ipairs(Players:GetPlayers()) do
		if p ~= player then
			local char = p.Character
			local hum = char and char:FindFirstChildOfClass("Humanoid")
			-- Prefer players who don't look ghosted (WalkSpeed > 0 and not fully ghost)
			if char and hum and hum.Health > 0 then
				-- Skip obvious spectators (SpectatorTag)
				if not char:FindFirstChild("SpectatorTag") then
					table.insert(list, p)
				end
			end
		end
	end
	-- If empty, fall back to any other player
	if #list == 0 then
		for _, p in ipairs(Players:GetPlayers()) do
			if p ~= player then
				table.insert(list, p)
			end
		end
	end
	return list
end

local function setTarget(p: Player?)
	targetPlayer = p
	if p then
		specLabel.Text = "👻 SPECTATING: " .. p.DisplayName
	else
		specLabel.Text = "👻 SPECTATING: —"
	end
end

local function cycle(delta: number)
	local list = getAliveCandidates()
	if #list == 0 then
		setTarget(nil)
		return
	end
	local idx = 1
	if targetPlayer then
		for i, p in ipairs(list) do
			if p == targetPlayer then
				idx = i
				break
			end
		end
	end
	-- wrap-around modulo
	local newIdx = ((idx - 1 + delta) % #list) + 1
	setTarget(list[newIdx])
end

prevBtn.MouseButton1Click:Connect(function()
	cycle(-1)
end)
nextBtn.MouseButton1Click:Connect(function()
	cycle(1)
end)

UserInputService.InputBegan:Connect(function(input, gp)
	if gp or not isSpectating then
		return
	end
	if input.KeyCode == Enum.KeyCode.Q or input.KeyCode == Enum.KeyCode.Left then
		cycle(-1)
	elseif input.KeyCode == Enum.KeyCode.E or input.KeyCode == Enum.KeyCode.Right then
		cycle(1)
	end
end)

----------------------------------------------------------------------
-- Camera follow
----------------------------------------------------------------------

local function stopCamera()
	if renderConn then
		renderConn:Disconnect()
		renderConn = nil
	end
	camera = workspace.CurrentCamera
	if camera then
		camera.CameraType = Enum.CameraType.Custom
	end
end

local function startCamera()
	stopCamera()
	camera = workspace.CurrentCamera
	if not camera then
		return
	end
	camera.CameraType = Enum.CameraType.Scriptable

	renderConn = RunService.RenderStepped:Connect(function()
		if not isSpectating then
			return
		end
		camera = workspace.CurrentCamera
		if not camera then
			return
		end
		camera.CameraType = Enum.CameraType.Scriptable

		if not targetPlayer or not targetPlayer.Parent then
			cycle(1)
		end
		local target = targetPlayer
		if not target then
			return
		end
		local char = target.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if not (hrp and hrp:IsA("BasePart")) then
			cycle(1)
			return
		end

		local goal = CFrame.new(hrp.Position + OFFSET, hrp.Position)
		camera.CFrame = camera.CFrame:Lerp(goal, LERP_ALPHA)
	end)
end

----------------------------------------------------------------------
-- Enter / Exit
----------------------------------------------------------------------

local function enterSpectator()
	if isSpectating then
		return
	end
	isSpectating = true
	screen.Enabled = true
	cycle(0) -- pick first / refresh
	if not targetPlayer then
		cycle(1)
	end
	startCamera()
	pcall(function()
		wind:Play()
	end)
	print("[SpectatorController] Entered spectator mode")
end

local function exitSpectator()
	if not isSpectating then
		-- Still ensure camera restore
		stopCamera()
		screen.Enabled = false
		pcall(function()
			wind:Stop()
		end)
		return
	end
	isSpectating = false
	screen.Enabled = false
	stopCamera()
	pcall(function()
		wind:Stop()
	end)
	targetPlayer = nil
	print("[SpectatorController] Exited spectator mode")
end

SpectatorMode.OnClientEvent:Connect(function(enabled)
	if enabled then
		enterSpectator()
	else
		exitSpectator()
	end
end)

PlayerEliminated.OnClientEvent:Connect(function(eliminatedPlayer)
	if not isSpectating then
		return
	end
	if eliminatedPlayer == targetPlayer then
		cycle(1)
	end
end)

RoundStarted.OnClientEvent:Connect(function(payload)
	if not isSpectating then
		return
	end
	if typeof(payload) == "table" and typeof(payload.timeLimit) == "number" then
		local remaining = payload.timeLimit
		task.spawn(function()
			while isSpectating and remaining >= 0 do
				local alive = #getAliveCandidates()
				overlay.Text = string.format("⏱ %ds | 👤 %d alive", remaining, alive)
				task.wait(1)
				remaining -= 1
			end
		end)
	end
end)

CountdownTick.OnClientEvent:Connect(function(data)
	if not isSpectating or typeof(data) ~= "table" then
		return
	end
	if data.phase == "intermission" and data.playerCount then
		overlay.Text = string.format("⏱ — | 👤 %d alive", data.playerCount)
	end
end)

print("[SpectatorController] Ready")
