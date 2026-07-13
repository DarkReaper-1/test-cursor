--[[
	ClientController (LocalScript — StarterPlayerScripts)
	Builds all game UI programmatically with TweenService animations.
	Listens to GameEvents remotes. Never decides eliminations.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local SoundService = game:GetService("SoundService")
local StarterGui = game:GetService("StarterGui")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local RoundConfig = require(ReplicatedStorage:WaitForChild("RoundConfig"))
local GameUtils = require(ReplicatedStorage:WaitForChild("GameUtils"))

local GameEvents = ReplicatedStorage:WaitForChild("GameEvents")
local RoundStarted = GameEvents:WaitForChild("RoundStarted") :: RemoteEvent
local RoundEnded = GameEvents:WaitForChild("RoundEnded") :: RemoteEvent
local PlayerEliminated = GameEvents:WaitForChild("PlayerEliminated") :: RemoteEvent
local GameOver = GameEvents:WaitForChild("GameOver") :: RemoteEvent
local CountdownTick = GameEvents:WaitForChild("CountdownTick") :: RemoteEvent
local RuleReveal = GameEvents:WaitForChild("RuleReveal") :: RemoteEvent
local UpdateLeaderboard = GameEvents:WaitForChild("UpdateLeaderboard") :: RemoteEvent

----------------------------------------------------------------------
-- Resolve / create GameHUD ScreenGui
----------------------------------------------------------------------

local gui = playerGui:FindFirstChild("GameHUD")
if not gui then
	gui = Instance.new("ScreenGui")
	gui.Name = "GameHUD"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = true
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	gui.Parent = playerGui
end
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true

pcall(function()
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.PlayerList, true)
end)

----------------------------------------------------------------------
-- UI helpers
----------------------------------------------------------------------

local function corner(parent, scale)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(scale or 0.08, 0)
	c.Parent = parent
	return c
end

local function stroke(parent, color, thickness)
	local s = Instance.new("UIStroke")
	s.Color = color or Color3.fromRGB(170, 80, 255)
	s.Thickness = thickness or 2
	s.Parent = parent
	return s
end

local function aspect(parent, ratio)
	local a = Instance.new("UIAspectRatioConstraint")
	a.AspectRatio = ratio or 1
	a.Parent = parent
	return a
end

local function tween(obj, info, props)
	local t = TweenService:Create(obj, info, props)
	t:Play()
	return t
end

local function clearChildren(frame)
	for _, child in ipairs(frame:GetChildren()) do
		if not child:IsA("UIAspectRatioConstraint") and not child:IsA("UICorner") then
			child:Destroy()
		end
	end
end

local function ensureFrame(name): Frame
	local f = gui:FindFirstChild(name)
	if not f then
		f = Instance.new("Frame")
		f.Name = name
		f.BackgroundTransparency = 1
		f.Size = UDim2.fromScale(1, 1)
		f.Parent = gui
	end
	f.Visible = false
	f.Size = UDim2.fromScale(1, 1)
	f.BackgroundTransparency = 1
	return f :: Frame
end

local lobbyFrame = ensureFrame("CountdownFrame") -- reuse for lobby/countdown
local roundBanner = ensureFrame("RoundBanner")
local playerCountFrame = ensureFrame("PlayerCount")
local eliminationBanner = ensureFrame("EliminationBanner")
local winnerScreen = ensureFrame("WinnerScreen")
ensureFrame("SpectatorLabel") -- reserved; SpectatorController uses its own UI

-- Dedicated HUD overlays (created dynamically, live under gui)
local hudRoot = Instance.new("Frame")
hudRoot.Name = "ActiveHUD"
hudRoot.BackgroundTransparency = 1
hudRoot.Size = UDim2.fromScale(1, 1)
hudRoot.Visible = false
hudRoot.Parent = gui

local leaderboardPanel = Instance.new("Frame")
leaderboardPanel.Name = "LeaderboardPanel"
leaderboardPanel.AnchorPoint = Vector2.new(1, 0)
leaderboardPanel.Position = UDim2.fromScale(0.99, 0.18)
leaderboardPanel.Size = UDim2.fromScale(0.18, 0.28)
leaderboardPanel.BackgroundColor3 = Color3.fromRGB(20, 10, 35)
leaderboardPanel.BackgroundTransparency = 0.25
leaderboardPanel.Visible = false
leaderboardPanel.Parent = gui
corner(leaderboardPanel, 0.06)
stroke(leaderboardPanel, Color3.fromRGB(170, 80, 255), 1.5)

----------------------------------------------------------------------
-- Sounds
----------------------------------------------------------------------

local function makeSound(name, id, volume)
	local s = Instance.new("Sound")
	s.Name = name
	s.SoundId = id
	s.Volume = volume or 0.4
	s.Parent = SoundService
	return s
end

-- rbxasset sounds (built-in tick / whoosh-ish)
local tickSound = makeSound("WAO_Tick", "rbxasset://sounds/switch.wav", 0.35)
local eliminateSound = makeSound("WAO_Eliminate", "rbxasset://sounds/electronicpingshort.wav", 0.5)

----------------------------------------------------------------------
-- LOBBY SCREEN
----------------------------------------------------------------------

local floatingEmojis: { TextLabel } = {}
local emojiConn: RBXScriptConnection? = nil

local function stopLobbyEmojis()
	if emojiConn then
		emojiConn:Disconnect()
		emojiConn = nil
	end
	for _, e in ipairs(floatingEmojis) do
		e:Destroy()
	end
	table.clear(floatingEmojis)
end

local function buildLobbyScreen()
	clearChildren(lobbyFrame)
	lobbyFrame.Visible = true
	lobbyFrame.BackgroundTransparency = 0
	lobbyFrame.BackgroundColor3 = Color3.fromRGB(25, 8, 45)

	local title = Instance.new("TextLabel")
	title.Name = "Title"
	title.BackgroundTransparency = 1
	title.AnchorPoint = Vector2.new(0.5, 0.5)
	title.Position = UDim2.fromScale(0.5, 0.28)
	title.Size = UDim2.fromScale(0.85, 0.12)
	title.Font = Enum.Font.GothamBlack
	title.Text = "WRONG ANSWER ONLY"
	title.TextColor3 = Color3.fromRGB(200, 80, 255)
	title.TextScaled = true
	title.Parent = lobbyFrame
	stroke(title, Color3.fromRGB(255, 180, 255), 1.5)

	-- Glow pulse on title
	task.spawn(function()
		while title.Parent and lobbyFrame.Visible do
			tween(title, TweenInfo.new(1.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
				TextColor3 = Color3.fromRGB(255, 140, 255),
			}).Completed:Wait()
			tween(title, TweenInfo.new(1.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
				TextColor3 = Color3.fromRGB(170, 60, 255),
			}).Completed:Wait()
		end
	end)

	local subtitle = Instance.new("TextLabel")
	subtitle.BackgroundTransparency = 1
	subtitle.AnchorPoint = Vector2.new(0.5, 0.5)
	subtitle.Position = UDim2.fromScale(0.5, 0.40)
	subtitle.Size = UDim2.fromScale(0.7, 0.06)
	subtitle.Font = Enum.Font.GothamMedium
	subtitle.Text = "Survive by doing the WRONG thing 🧠"
	subtitle.TextColor3 = Color3.fromRGB(220, 200, 255)
	subtitle.TextScaled = true
	subtitle.Parent = lobbyFrame
	local italic = Instance.new("UITextSizeConstraint")
	italic.Parent = subtitle

	local countLabel = Instance.new("TextLabel")
	countLabel.Name = "PlayerCountLabel"
	countLabel.BackgroundTransparency = 1
	countLabel.AnchorPoint = Vector2.new(0.5, 0.5)
	countLabel.Position = UDim2.fromScale(0.5, 0.52)
	countLabel.Size = UDim2.fromScale(0.5, 0.05)
	countLabel.Font = Enum.Font.GothamBold
	countLabel.Text = "Players: 0/2"
	countLabel.TextColor3 = Color3.new(1, 1, 1)
	countLabel.TextScaled = true
	countLabel.Parent = lobbyFrame

	local barBg = Instance.new("Frame")
	barBg.Name = "ProgressBg"
	barBg.AnchorPoint = Vector2.new(0.5, 0.5)
	barBg.Position = UDim2.fromScale(0.5, 0.58)
	barBg.Size = UDim2.fromScale(0.45, 0.025)
	barBg.BackgroundColor3 = Color3.fromRGB(40, 20, 60)
	barBg.Parent = lobbyFrame
	corner(barBg, 1)

	local barFill = Instance.new("Frame")
	barFill.Name = "ProgressFill"
	barFill.Size = UDim2.fromScale(0, 1)
	barFill.BackgroundColor3 = Color3.fromRGB(180, 80, 255)
	barFill.Parent = barBg
	corner(barFill, 1)

	local countdownLabel = Instance.new("TextLabel")
	countdownLabel.Name = "CountdownLabel"
	countdownLabel.BackgroundTransparency = 1
	countdownLabel.AnchorPoint = Vector2.new(0.5, 0.5)
	countdownLabel.Position = UDim2.fromScale(0.5, 0.70)
	countdownLabel.Size = UDim2.fromScale(0.4, 0.1)
	countdownLabel.Font = Enum.Font.GothamBlack
	countdownLabel.Text = ""
	countdownLabel.TextColor3 = Color3.fromRGB(255, 215, 0)
	countdownLabel.TextScaled = true
	countdownLabel.Parent = lobbyFrame

	-- Floating emojis
	stopLobbyEmojis()
	local emojis = { "❓", "🤔", "💀", "🧠" }
	for i = 1, 12 do
		local e = Instance.new("TextLabel")
		e.BackgroundTransparency = 1
		e.Size = UDim2.fromScale(0.06, 0.06)
		e.Position = UDim2.fromScale(math.random() * 0.9, 0.85 + math.random() * 0.15)
		e.Text = emojis[((i - 1) % #emojis) + 1]
		e.TextScaled = true
		e.TextTransparency = 0.2
		e.Parent = lobbyFrame
		table.insert(floatingEmojis, e)
	end
	emojiConn = RunService.RenderStepped:Connect(function(dt)
		for _, e in ipairs(floatingEmojis) do
			local pos = e.Position
			local newY = pos.Y.Scale - dt * 0.08
			local newX = pos.X.Scale + math.sin(os.clock() + pos.X.Scale * 10) * dt * 0.02
			if newY < -0.1 then
				newY = 1.05
				newX = math.random() * 0.9
			end
			e.Position = UDim2.fromScale(math.clamp(newX, 0, 0.94), newY)
		end
	end)
end

buildLobbyScreen()

----------------------------------------------------------------------
-- ACTIVE HUD (round panel / timer / alive count)
----------------------------------------------------------------------

local roundPanel: TextLabel
local timerLabel: TextLabel
local aliveLabel: TextLabel
local timerStroke: UIStroke
local hudTimerValue = 0
local hudTimerRunning = false

local function buildActiveHUD()
	clearChildren(hudRoot)

	local left = Instance.new("Frame")
	left.AnchorPoint = Vector2.new(0, 0)
	left.Position = UDim2.fromScale(0.02, 0.03)
	left.Size = UDim2.fromScale(0.22, 0.07)
	left.BackgroundColor3 = Color3.fromRGB(20, 10, 35)
	left.BackgroundTransparency = 0.2
	left.Parent = hudRoot
	corner(left, 0.15)
	stroke(left)

	roundPanel = Instance.new("TextLabel")
	roundPanel.BackgroundTransparency = 1
	roundPanel.Size = UDim2.fromScale(1, 1)
	roundPanel.Font = Enum.Font.GothamBold
	roundPanel.Text = "ROUND 1 of 5"
	roundPanel.TextColor3 = Color3.new(1, 1, 1)
	roundPanel.TextScaled = true
	roundPanel.Parent = left

	local timerFrame = Instance.new("Frame")
	timerFrame.AnchorPoint = Vector2.new(1, 0)
	timerFrame.Position = UDim2.fromScale(0.98, 0.02)
	timerFrame.Size = UDim2.fromScale(0.12, 0.12)
	timerFrame.BackgroundColor3 = Color3.fromRGB(20, 10, 35)
	timerFrame.BackgroundTransparency = 0.15
	timerFrame.Parent = hudRoot
	corner(timerFrame, 1)
	timerStroke = stroke(timerFrame, Color3.fromRGB(170, 80, 255), 3)
	aspect(timerFrame, 1)

	timerLabel = Instance.new("TextLabel")
	timerLabel.BackgroundTransparency = 1
	timerLabel.Size = UDim2.fromScale(1, 1)
	timerLabel.Font = Enum.Font.GothamBlack
	timerLabel.Text = "0:30"
	timerLabel.TextColor3 = Color3.new(1, 1, 1)
	timerLabel.TextScaled = true
	timerLabel.Parent = timerFrame

	local bottom = Instance.new("Frame")
	bottom.AnchorPoint = Vector2.new(0, 1)
	bottom.Position = UDim2.fromScale(0.02, 0.97)
	bottom.Size = UDim2.fromScale(0.24, 0.06)
	bottom.BackgroundColor3 = Color3.fromRGB(20, 10, 35)
	bottom.BackgroundTransparency = 0.2
	bottom.Parent = hudRoot
	corner(bottom, 0.2)
	stroke(bottom)

	aliveLabel = Instance.new("TextLabel")
	aliveLabel.BackgroundTransparency = 1
	aliveLabel.Size = UDim2.fromScale(1, 1)
	aliveLabel.Font = Enum.Font.GothamBold
	aliveLabel.Text = "👤 0 players alive"
	aliveLabel.TextColor3 = Color3.new(1, 1, 1)
	aliveLabel.TextScaled = true
	aliveLabel.Parent = bottom
end

buildActiveHUD()

local function startHudTimer(seconds: number)
	hudTimerValue = seconds
	hudTimerRunning = true
	task.spawn(function()
		while hudTimerRunning and hudTimerValue > 0 do
			if timerLabel then
				timerLabel.Text = GameUtils.FormatTime(hudTimerValue)
				if hudTimerValue <= 10 then
					timerLabel.TextColor3 = Color3.fromRGB(255, 60, 60)
					if timerStroke then
						tween(timerStroke, TweenInfo.new(0.25), { Thickness = 6 })
						task.delay(0.25, function()
							if timerStroke then
								tween(timerStroke, TweenInfo.new(0.25), { Thickness = 3 })
							end
						end)
					end
					pcall(function()
						tickSound:Play()
					end)
				else
					timerLabel.TextColor3 = Color3.new(1, 1, 1)
				end
			end
			task.wait(1)
			hudTimerValue -= 1
		end
		if timerLabel and hudTimerValue <= 0 then
			timerLabel.Text = "0:00"
		end
	end)
end

local function stopHudTimer()
	hudTimerRunning = false
end

----------------------------------------------------------------------
-- ROUND INTRO (RuleReveal / RoundStarted sequence)
----------------------------------------------------------------------

-- Pending round info from RuleReveal so RoundStarted can start the HUD timer in sync
local pendingRoundNumber = 1

--[[
	Rule-reveal intro runs during the server's 4s RuleReveal wait.
	RoundStarted (fired after that wait) only shows the HUD + starts the timer.
]]
local function playRuleRevealIntro(roundNumber: number, rule: string)
	lobbyFrame.Visible = false
	stopLobbyEmojis()
	winnerScreen.Visible = false
	playerCountFrame.Visible = false
	roundBanner.Visible = true
	clearChildren(roundBanner)
	pendingRoundNumber = roundNumber

	local black = Instance.new("Frame")
	black.Size = UDim2.fromScale(1, 1)
	black.BackgroundColor3 = Color3.new(0, 0, 0)
	black.BackgroundTransparency = 1
	black.Parent = roundBanner
	tween(black, TweenInfo.new(0.5), { BackgroundTransparency = 0.15 })

	local roundText = Instance.new("TextLabel")
	roundText.Name = "RoundText"
	roundText.BackgroundTransparency = 1
	roundText.AnchorPoint = Vector2.new(0.5, 0.5)
	roundText.Position = UDim2.fromScale(-0.5, 0.35)
	roundText.Size = UDim2.fromScale(0.6, 0.1)
	roundText.Font = Enum.Font.GothamBlack
	roundText.Text = "ROUND " .. tostring(roundNumber)
	roundText.TextColor3 = Color3.fromRGB(200, 100, 255)
	roundText.TextScaled = true
	roundText.Parent = roundBanner

	tween(roundText, TweenInfo.new(0.55, Enum.EasingStyle.Bounce, Enum.EasingDirection.Out), {
		Position = UDim2.fromScale(0.5, 0.35),
	})

	local ruleLabel = Instance.new("TextLabel")
	ruleLabel.Name = "RuleLabel"
	ruleLabel.BackgroundTransparency = 1
	ruleLabel.AnchorPoint = Vector2.new(0.5, 0.5)
	ruleLabel.Position = UDim2.fromScale(0.5, 0.55)
	ruleLabel.Size = UDim2.fromScale(0.9, 0.18)
	ruleLabel.Font = Enum.Font.GothamBlack
	ruleLabel.Text = rule
	ruleLabel.TextColor3 = Color3.new(1, 1, 1)
	ruleLabel.TextScaled = true
	ruleLabel.TextTransparency = 1
	ruleLabel.Parent = roundBanner

	local ruleStroke = stroke(ruleLabel, Color3.fromRGB(255, 40, 40), 0)

	task.delay(0.45, function()
		if ruleLabel.Parent then
			tween(ruleLabel, TweenInfo.new(0.4), { TextTransparency = 0 })
		end
	end)

	task.spawn(function()
		for _ = 1, 8 do
			if not ruleStroke.Parent then
				break
			end
			tween(ruleStroke, TweenInfo.new(0.25), { Thickness = 4 })
			task.wait(0.25)
			tween(ruleStroke, TweenInfo.new(0.25), { Thickness = 1 })
			task.wait(0.25)
			pcall(function()
				tickSound:Play()
			end)
		end
	end)
end

local function finishIntroAndShowHUD(roundNumber: number, timeLimit: number)
	local roundText = roundBanner:FindFirstChild("RoundText")
	local ruleLabel = roundBanner:FindFirstChild("RuleLabel")
	local black = roundBanner:FindFirstChildWhichIsA("Frame")

	if roundText and roundText:IsA("GuiObject") then
		tween(roundText, TweenInfo.new(0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			Position = UDim2.fromScale(1.5, 0.35),
		})
	end
	if ruleLabel and ruleLabel:IsA("TextLabel") then
		tween(ruleLabel, TweenInfo.new(0.35), { TextTransparency = 1 })
	end
	if black and black:IsA("Frame") and black.Name ~= "RoundText" then
		tween(black, TweenInfo.new(0.35), { BackgroundTransparency = 1 })
	end

	task.delay(0.4, function()
		roundBanner.Visible = false
	end)

	if roundPanel then
		roundPanel.Text = string.format("ROUND %d of %d", roundNumber, RoundConfig.GetTotalRounds())
	end
	if aliveLabel then
		aliveLabel.Text = string.format("👤 %d players alive", #Players:GetPlayers())
	end
	hudRoot.Visible = true
	startHudTimer(timeLimit)
end

----------------------------------------------------------------------
-- ELIMINATION / TOASTS
----------------------------------------------------------------------

local function screenShake()
	local cam = workspace.CurrentCamera
	if not cam then
		return
	end
	local original = cam.CFrame
	for _ = 1, 6 do
		cam.CFrame = original * CFrame.new(math.random(-1, 1) * 0.4, math.random(-1, 1) * 0.4, 0)
		task.wait(0.03)
	end
	cam.CFrame = original
end

local function showSelfEliminated(reason: string)
	eliminationBanner.Visible = true
	clearChildren(eliminationBanner)

	local flash = Instance.new("Frame")
	flash.Size = UDim2.fromScale(1, 1)
	flash.BackgroundColor3 = Color3.fromRGB(180, 0, 0)
	flash.BackgroundTransparency = 1
	flash.Parent = eliminationBanner

	task.spawn(function()
		for _ = 1, 3 do
			tween(flash, TweenInfo.new(0.12), { BackgroundTransparency = 0.45 })
			task.wait(0.12)
			tween(flash, TweenInfo.new(0.12), { BackgroundTransparency = 1 })
			task.wait(0.12)
		end
	end)

	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.AnchorPoint = Vector2.new(0.5, 0.5)
	label.Position = UDim2.fromScale(0.5, 0.45)
	label.Size = UDim2.fromScale(0.85, 0.12)
	label.Font = Enum.Font.GothamBlack
	label.Text = "YOU WERE ELIMINATED 💀"
	label.TextColor3 = Color3.fromRGB(255, 80, 80)
	label.TextScaled = true
	label.Parent = eliminationBanner

	local reasonLabel = Instance.new("TextLabel")
	reasonLabel.BackgroundTransparency = 1
	reasonLabel.AnchorPoint = Vector2.new(0.5, 0.5)
	reasonLabel.Position = UDim2.fromScale(0.5, 0.58)
	reasonLabel.Size = UDim2.fromScale(0.7, 0.06)
	reasonLabel.Font = Enum.Font.Gotham
	reasonLabel.Text = reason
	reasonLabel.TextColor3 = Color3.fromRGB(255, 200, 200)
	reasonLabel.TextScaled = true
	reasonLabel.Parent = eliminationBanner

	pcall(function()
		eliminateSound:Play()
	end)
	task.spawn(screenShake)

	task.wait(2)
	eliminationBanner.Visible = false
end

local function showToast(text: string)
	local toast = Instance.new("TextLabel")
	toast.AnchorPoint = Vector2.new(1, 0)
	toast.Position = UDim2.fromScale(1.2, 0.16)
	toast.Size = UDim2.fromScale(0.32, 0.05)
	toast.BackgroundColor3 = Color3.fromRGB(30, 10, 20)
	toast.BackgroundTransparency = 0.2
	toast.Font = Enum.Font.GothamBold
	toast.Text = text
	toast.TextColor3 = Color3.new(1, 1, 1)
	toast.TextScaled = true
	toast.Parent = gui
	corner(toast, 0.2)
	stroke(toast, Color3.fromRGB(255, 80, 80), 1)

	tween(toast, TweenInfo.new(0.35, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Position = UDim2.fromScale(0.98, 0.16),
	})
	task.delay(2.5, function()
		tween(toast, TweenInfo.new(0.3), { TextTransparency = 1, BackgroundTransparency = 1 })
		task.wait(0.35)
		toast:Destroy()
	end)
end

----------------------------------------------------------------------
-- ROUND ENDED
----------------------------------------------------------------------

local function showRoundEnded(data: any)
	stopHudTimer()
	hudRoot.Visible = false

	playerCountFrame.Visible = true
	clearChildren(playerCountFrame)
	playerCountFrame.BackgroundColor3 = Color3.fromRGB(10, 30, 15)
	playerCountFrame.BackgroundTransparency = 0.2

	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.AnchorPoint = Vector2.new(0.5, 0.5)
	title.Position = UDim2.fromScale(0.5, 0.28)
	title.Size = UDim2.fromScale(0.8, 0.1)
	title.Font = Enum.Font.GothamBlack
	title.Text = string.format("ROUND %d COMPLETE ✅", data.roundNumber or 0)
	title.TextColor3 = Color3.fromRGB(80, 255, 120)
	title.TextScaled = true
	title.Parent = playerCountFrame

	local reveal = Instance.new("TextLabel")
	reveal.BackgroundTransparency = 1
	reveal.AnchorPoint = Vector2.new(0.5, 0.5)
	reveal.Position = UDim2.fromScale(0.5, 0.40)
	reveal.Size = UDim2.fromScale(0.85, 0.08)
	reveal.Font = Enum.Font.Gotham
	reveal.Text = data.revealText or ""
	reveal.TextColor3 = Color3.fromRGB(255, 230, 120)
	reveal.TextScaled = true
	reveal.Parent = playerCountFrame

	local list = Instance.new("TextLabel")
	list.BackgroundTransparency = 1
	list.AnchorPoint = Vector2.new(0.5, 0.5)
	list.Position = UDim2.fromScale(0.5, 0.55)
	list.Size = UDim2.fromScale(0.7, 0.18)
	list.Font = Enum.Font.GothamBold
	list.TextColor3 = Color3.new(1, 1, 1)
	list.TextScaled = true
	list.TextYAlignment = Enum.TextYAlignment.Top
	local names = data.survivors or {}
	local lines = { "Survivors:" }
	for _, n in ipairs(names) do
		table.insert(lines, "✅ " .. n)
	end
	list.Text = table.concat(lines, "\n")
	list.Parent = playerCountFrame

	local nextLabel = Instance.new("TextLabel")
	nextLabel.Name = "NextCountdown"
	nextLabel.BackgroundTransparency = 1
	nextLabel.AnchorPoint = Vector2.new(0.5, 0.5)
	nextLabel.Position = UDim2.fromScale(0.5, 0.78)
	nextLabel.Size = UDim2.fromScale(0.5, 0.06)
	nextLabel.Font = Enum.Font.GothamBold
	nextLabel.Text = "Next round in 5..."
	nextLabel.TextColor3 = Color3.fromRGB(200, 200, 255)
	nextLabel.TextScaled = true
	nextLabel.Parent = playerCountFrame

	task.spawn(function()
		for i = 5, 1, -1 do
			if nextLabel.Parent then
				nextLabel.Text = "Next round in " .. i .. "..."
			end
			task.wait(1)
		end
		playerCountFrame.Visible = false
	end)
end

----------------------------------------------------------------------
-- GAME OVER
----------------------------------------------------------------------

local function showGameOver(winnerName: string)
	stopHudTimer()
	hudRoot.Visible = false
	lobbyFrame.Visible = false
	roundBanner.Visible = false
	playerCountFrame.Visible = false

	winnerScreen.Visible = true
	clearChildren(winnerScreen)
	winnerScreen.BackgroundColor3 = Color3.fromRGB(20, 12, 5)
	winnerScreen.BackgroundTransparency = 0.1

	local burst = Instance.new("Frame")
	burst.AnchorPoint = Vector2.new(0.5, 0.5)
	burst.Position = UDim2.fromScale(0.5, 0.5)
	burst.Size = UDim2.fromScale(0.05, 0.05)
	burst.BackgroundColor3 = Color3.fromRGB(255, 215, 0)
	burst.BackgroundTransparency = 0.5
	burst.Parent = winnerScreen
	corner(burst, 1)
	tween(burst, TweenInfo.new(0.7, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = UDim2.fromScale(1.5, 1.5),
		BackgroundTransparency = 1,
	})

	local winLabel = Instance.new("TextLabel")
	winLabel.BackgroundTransparency = 1
	winLabel.AnchorPoint = Vector2.new(0.5, 0.5)
	winLabel.Position = UDim2.fromScale(0.5, 0.4)
	winLabel.Size = UDim2.fromScale(0.1, 0.05)
	winLabel.Font = Enum.Font.GothamBlack
	winLabel.Text = "🏆 " .. winnerName .. " WINS!"
	winLabel.TextColor3 = Color3.fromRGB(255, 215, 0)
	winLabel.TextScaled = true
	winLabel.TextTransparency = 1
	winLabel.Parent = winnerScreen

	tween(winLabel, TweenInfo.new(0.6, Enum.EasingStyle.Bounce, Enum.EasingDirection.Out), {
		Size = UDim2.fromScale(0.85, 0.14),
		TextTransparency = 0,
	})

	local playAgain = Instance.new("TextButton")
	playAgain.AnchorPoint = Vector2.new(0.5, 0.5)
	playAgain.Position = UDim2.fromScale(0.38, 0.65)
	playAgain.Size = UDim2.fromScale(0.22, 0.08)
	playAgain.BackgroundColor3 = Color3.fromRGB(80, 200, 90)
	playAgain.Font = Enum.Font.GothamBlack
	playAgain.Text = "PLAY AGAIN"
	playAgain.TextColor3 = Color3.new(1, 1, 1)
	playAgain.TextScaled = true
	playAgain.Parent = winnerScreen
	corner(playAgain, 0.2)
	stroke(playAgain, Color3.fromRGB(255, 255, 255), 2)
	playAgain.MouseButton1Click:Connect(function()
		winnerScreen.Visible = false
		buildLobbyScreen()
	end)

	local leaveBtn = Instance.new("TextButton")
	leaveBtn.AnchorPoint = Vector2.new(0.5, 0.5)
	leaveBtn.Position = UDim2.fromScale(0.62, 0.65)
	leaveBtn.Size = UDim2.fromScale(0.22, 0.08)
	leaveBtn.BackgroundColor3 = Color3.fromRGB(180, 50, 50)
	leaveBtn.Font = Enum.Font.GothamBlack
	leaveBtn.Text = "LEAVE GAME"
	leaveBtn.TextColor3 = Color3.new(1, 1, 1)
	leaveBtn.TextScaled = true
	leaveBtn.Parent = winnerScreen
	corner(leaveBtn, 0.2)
	stroke(leaveBtn, Color3.fromRGB(255, 255, 255), 2)
	leaveBtn.MouseButton1Click:Connect(function()
		pcall(function()
			player:Kick("Thanks for playing Wrong Answer Only!")
		end)
	end)
end

----------------------------------------------------------------------
-- LEADERBOARD
----------------------------------------------------------------------

local function updateLeaderboardUI(entries: any)
	clearChildren(leaderboardPanel)
	leaderboardPanel.Visible = true

	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Size = UDim2.fromScale(1, 0.18)
	title.Font = Enum.Font.GothamBold
	title.Text = "🏆 TOP WINS"
	title.TextColor3 = Color3.fromRGB(255, 215, 0)
	title.TextScaled = true
	title.Parent = leaderboardPanel

	if typeof(entries) ~= "table" then
		return
	end
	for i, entry in ipairs(entries) do
		local row = Instance.new("TextLabel")
		row.BackgroundTransparency = 1
		row.Position = UDim2.fromScale(0.05, 0.15 + i * 0.15)
		row.Size = UDim2.fromScale(0.9, 0.14)
		row.Font = Enum.Font.Gotham
		row.TextXAlignment = Enum.TextXAlignment.Left
		row.Text = string.format("%d. %s — %d", i, entry.name or "?", entry.wins or 0)
		row.TextColor3 = Color3.new(1, 1, 1)
		row.TextScaled = true
		row.Parent = leaderboardPanel
	end
end

----------------------------------------------------------------------
-- REMOTE HANDLERS
----------------------------------------------------------------------

CountdownTick.OnClientEvent:Connect(function(data)
	if typeof(data) ~= "table" then
		return
	end
	local phase = data.phase

	if phase == "lobby" or phase == "countdown" then
		if not lobbyFrame.Visible then
			buildLobbyScreen()
		end
		local countLabel = lobbyFrame:FindFirstChild("PlayerCountLabel")
		local barFill = lobbyFrame:FindFirstChild("ProgressBg") and lobbyFrame.ProgressBg:FindFirstChild("ProgressFill")
		local countdownLabel = lobbyFrame:FindFirstChild("CountdownLabel")

		local needed = data.needed or 2
		local count = data.playerCount or 0
		if countLabel and countLabel:IsA("TextLabel") then
			countLabel.Text = string.format("Players: %d/%d", count, needed)
		end
		if barFill and barFill:IsA("Frame") then
			local alpha = math.clamp(count / math.max(needed, 1), 0, 1)
			tween(barFill, TweenInfo.new(0.25), { Size = UDim2.fromScale(alpha, 1) })
		end
		if countdownLabel and countdownLabel:IsA("TextLabel") then
			if phase == "countdown" and data.seconds then
				countdownLabel.Text = tostring(data.seconds)
				if data.seconds <= 10 then
					countdownLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
					pcall(function()
						tickSound:Play()
					end)
				else
					countdownLabel.TextColor3 = Color3.fromRGB(255, 215, 0)
				end
			else
				countdownLabel.Text = data.message or "Waiting..."
				countdownLabel.TextColor3 = Color3.fromRGB(200, 180, 255)
			end
		end
	elseif phase == "intermission" then
		-- Optional light update — RoundEnded UI already handles the 5s feel
		if aliveLabel then
			aliveLabel.Text = string.format("👤 %d players alive", data.playerCount or 0)
		end
	end
end)

RuleReveal.OnClientEvent:Connect(function(rule, roundNumber, roundName)
	-- SwapMechanic mid-round warnings
	if typeof(roundName) == "string" and roundName == "ZONE SWAP" then
		showToast(tostring(rule))
		return
	end
	-- Pre-round fake rule reveal (runs during server's 4s wait)
	if typeof(rule) == "string" and typeof(roundNumber) == "number" then
		playRuleRevealIntro(roundNumber, rule)
	end
end)

RoundStarted.OnClientEvent:Connect(function(payload)
	if typeof(payload) ~= "table" then
		return
	end
	-- Slide intro out and start HUD timer in sync with server round clock
	finishIntroAndShowHUD(payload.roundNumber or pendingRoundNumber, payload.timeLimit or 30)
end)

RoundEnded.OnClientEvent:Connect(function(data)
	if typeof(data) ~= "table" then
		return
	end
	showRoundEnded(data)
end)

PlayerEliminated.OnClientEvent:Connect(function(eliminatedPlayer, reason)
	if typeof(eliminatedPlayer) ~= "Instance" or not eliminatedPlayer:IsA("Player") then
		return
	end
	reason = typeof(reason) == "string" and reason or "Could not adapt in time"

	if eliminatedPlayer == player then
		task.spawn(showSelfEliminated, reason)
		stopHudTimer()
		hudRoot.Visible = false
	else
		showToast("💀 " .. eliminatedPlayer.DisplayName .. " was eliminated")
	end

	-- Update alive count estimate (client-side)
	if aliveLabel then
		local alive = 0
		for _, p in ipairs(Players:GetPlayers()) do
			-- Rough: everyone minus those we can't know perfectly; show player count for now
			alive += 1
		end
		-- Prefer decrement display
		aliveLabel.Text = string.format("👤 players remaining")
	end
end)

GameOver.OnClientEvent:Connect(function(winnerName, _winnerUserId)
	showGameOver(typeof(winnerName) == "string" and winnerName or "Nobody")
end)

UpdateLeaderboard.OnClientEvent:Connect(function(entries)
	updateLeaderboardUI(entries)
end)

print("[ClientController] UI ready")
