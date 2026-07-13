--[[
	MapBuilder — paste into the Studio COMMAND BAR and run ONCE.
	Builds Baseplate + all Maps geometry for "Wrong Answer Only".
	Every Part is Anchored = true.

	Usage:
	  1. Open Roblox Studio with your place
	  2. Open View → Command Bar
	  3. Paste this entire script and press Enter
]]

local function part(props)
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for k, v in pairs(props) do
		p[k] = v
	end
	return p
end

local function neonTrim(parent, size, cframe, color)
	local t = part({
		Name = "NeonTrim",
		Size = size,
		CFrame = cframe,
		Color = color,
		Material = Enum.Material.Neon,
		Parent = parent,
	})
	return t
end

local function surfaceSign(parentPart, text, textColor, bgColor, studsOffset)
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 50
	gui.Parent = parentPart

	local frame = Instance.new("Frame")
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundColor3 = bgColor or Color3.fromRGB(0, 0, 0)
	frame.BorderSizePixel = 0
	frame.Parent = gui

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = textColor or Color3.fromRGB(255, 255, 255)
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.Parent = frame

	return gui
end

local function makeSpawns(parent, positions, y)
	for i, pos in ipairs(positions) do
		local s = Instance.new("SpawnLocation")
		s.Name = "Spawn" .. i
		s.Size = Vector3.new(4, 1, 4)
		s.Position = Vector3.new(pos.X, y, pos.Z)
		s.Anchored = true
		s.Duration = 0
		s.Neutral = true
		s.Transparency = 0.3
		s.BrickColor = BrickColor.new("Bright violet")
		s.Parent = parent
	end
end

local function gridSpawns(cols, rows, origin, spacing)
	local list = {}
	local startX = origin.X - ((cols - 1) * spacing) / 2
	local startZ = origin.Z - ((rows - 1) * spacing) / 2
	for r = 0, rows - 1 do
		for c = 0, cols - 1 do
			table.insert(list, Vector3.new(startX + c * spacing, origin.Y, startZ + r * spacing))
		end
	end
	return list
end

----------------------------------------------------------------------
-- Clean / create folders
----------------------------------------------------------------------

local existing = workspace:FindFirstChild("Maps")
if existing then
	existing:Destroy()
end

local maps = Instance.new("Folder")
maps.Name = "Maps"
maps.Parent = workspace

-- Baseplate
local oldBase = workspace:FindFirstChild("Baseplate")
if oldBase then
	oldBase:Destroy()
end
part({
	Name = "Baseplate",
	Size = Vector3.new(99999, 1, 99999),
	Position = Vector3.new(0, 0, 0),
	Color = Color3.fromRGB(50, 50, 50),
	Material = Enum.Material.Grass,
	Parent = workspace,
})

----------------------------------------------------------------------
-- LOBBY (center 0,1,0)
----------------------------------------------------------------------

local lobby = Instance.new("Model")
lobby.Name = "Lobby"
lobby.Parent = maps

part({
	Name = "Floor",
	Size = Vector3.new(100, 2, 100),
	Position = Vector3.new(0, 1, 0),
	Color = Color3.fromRGB(99, 95, 98),
	Material = Enum.Material.SmoothPlastic,
	Parent = lobby,
})

-- Neon purple border strips on edges
local purple = Color3.fromRGB(170, 0, 255)
neonTrim(lobby, Vector3.new(100, 1, 2), CFrame.new(0, 2.5, -50), purple)
neonTrim(lobby, Vector3.new(100, 1, 2), CFrame.new(0, 2.5, 50), purple)
neonTrim(lobby, Vector3.new(2, 1, 100), CFrame.new(-50, 2.5, 0), purple)
neonTrim(lobby, Vector3.new(2, 1, 100), CFrame.new(50, 2.5, 0), purple)

-- Sign post at 0,8,-40
local signPost = part({
	Name = "TitleSign",
	Size = Vector3.new(40, 8, 1),
	Position = Vector3.new(0, 8, -40),
	Color = Color3.fromRGB(20, 10, 30),
	Material = Enum.Material.SmoothPlastic,
	Parent = lobby,
})
surfaceSign(signPost, "WRONG ANSWER ONLY", Color3.fromRGB(200, 80, 255), Color3.fromRGB(20, 5, 35))

local light = Instance.new("PointLight")
light.Brightness = 2
light.Range = 40
light.Color = purple
light.Parent = part({
	Name = "CenterLight",
	Size = Vector3.new(1, 1, 1),
	Position = Vector3.new(0, 8, 0),
	Transparency = 1,
	CanCollide = false,
	Parent = lobby,
})

makeSpawns(lobby, gridSpawns(4, 3, Vector3.new(0, 2, 0), 8), 2)

----------------------------------------------------------------------
-- Map_Platform (center 0,1,300)
----------------------------------------------------------------------

local mapPlatform = Instance.new("Model")
mapPlatform.Name = "Map_Platform"
mapPlatform.Parent = maps

local lava = part({
	Name = "LavaFloor",
	Size = Vector3.new(150, 2, 150),
	Position = Vector3.new(0, 1, 300),
	Color = Color3.fromRGB(255, 60, 20),
	Material = Enum.Material.Neon,
	Parent = mapPlatform,
})

part({
	Name = "StartingPlatform",
	Size = Vector3.new(50, 2, 50),
	Position = Vector3.new(0, 25, 300),
	Color = Color3.fromRGB(120, 120, 120),
	Material = Enum.Material.SmoothPlastic,
	Parent = mapPlatform,
})
makeSpawns(mapPlatform, gridSpawns(4, 3, Vector3.new(0, 26, 300), 6), 26)

local function labeledPlatform(name, color, position, signText)
	local p = part({
		Name = name,
		Size = Vector3.new(30, 4, 30),
		Position = position,
		Color = color,
		Material = Enum.Material.SmoothPlastic,
		Parent = mapPlatform,
	})
	-- Neon edge trim matching color
	local y = position.Y + 2.1
	local hx, hz = 15, 15
	neonTrim(mapPlatform, Vector3.new(30, 0.4, 0.4), CFrame.new(position.X, y, position.Z - hz), color)
	neonTrim(mapPlatform, Vector3.new(30, 0.4, 0.4), CFrame.new(position.X, y, position.Z + hz), color)
	neonTrim(mapPlatform, Vector3.new(0.4, 0.4, 30), CFrame.new(position.X - hx, y, position.Z), color)
	neonTrim(mapPlatform, Vector3.new(0.4, 0.4, 30), CFrame.new(position.X + hx, y, position.Z), color)

	local sign = part({
		Name = name .. "Sign",
		Size = Vector3.new(18, 4, 0.5),
		Position = position + Vector3.new(0, 8, 0),
		Color = color,
		Material = Enum.Material.SmoothPlastic,
		Parent = mapPlatform,
	})
	surfaceSign(sign, signText, Color3.new(1, 1, 1), color)
	return p
end

labeledPlatform("SafePlatform", Color3.fromRGB(40, 200, 60), Vector3.new(-20, 15, 285), "SAFE ✅")
labeledPlatform("DangerPlatform", Color3.fromRGB(220, 40, 40), Vector3.new(20, 15, 285), "DANGER ☠️")
labeledPlatform("MaybePlatform", Color3.fromRGB(240, 200, 40), Vector3.new(-20, 15, 315), "MAYBE 🤔")
labeledPlatform("RiskyPlatform", Color3.fromRGB(40, 100, 255), Vector3.new(20, 15, 315), "RISKY ❓")

----------------------------------------------------------------------
-- Map_Button (center 0,1,600)
----------------------------------------------------------------------

local mapButton = Instance.new("Model")
mapButton.Name = "Map_Button"
mapButton.Parent = maps

part({
	Name = "Floor",
	Size = Vector3.new(80, 2, 80),
	Position = Vector3.new(0, 1, 600),
	Color = Color3.fromRGB(40, 40, 40),
	Material = Enum.Material.SmoothPlastic,
	Parent = mapButton,
})

-- Walls 20 tall + ceiling
part({ Name = "WallLeft", Size = Vector3.new(2, 20, 80), Position = Vector3.new(-40, 11, 600), Color = Color3.fromRGB(35, 35, 35), Parent = mapButton })
part({ Name = "WallRight", Size = Vector3.new(2, 20, 80), Position = Vector3.new(40, 11, 600), Color = Color3.fromRGB(35, 35, 35), Parent = mapButton })
part({ Name = "WallBack", Size = Vector3.new(80, 20, 2), Position = Vector3.new(0, 11, 640), Color = Color3.fromRGB(35, 35, 35), Parent = mapButton })
-- Front wall split — two 35-wide parts leaving 10-stud doorway at center (0,3,560)
part({ Name = "WallFrontL", Size = Vector3.new(35, 20, 2), Position = Vector3.new(-22.5, 11, 560), Color = Color3.fromRGB(35, 35, 35), Parent = mapButton })
part({ Name = "WallFrontR", Size = Vector3.new(35, 20, 2), Position = Vector3.new(22.5, 11, 560), Color = Color3.fromRGB(35, 35, 35), Parent = mapButton })
part({ Name = "Ceiling", Size = Vector3.new(80, 2, 80), Position = Vector3.new(0, 22, 600), Color = Color3.fromRGB(30, 30, 30), Parent = mapButton })

-- Warning sign on back wall
local warnSign = part({
	Name = "WarningSign",
	Size = Vector3.new(50, 8, 0.5),
	Position = Vector3.new(0, 14, 638.5),
	Color = Color3.fromRGB(0, 0, 0),
	Parent = mapButton,
})
surfaceSign(warnSign, "⛔ WARNING — DO NOT PRESS BUTTONS ⛔", Color3.fromRGB(255, 40, 40), Color3.fromRGB(0, 0, 0))

-- 20 buttons in 4 rows x 5 cols
local btnIndex = 1
for row = 0, 3 do
	for col = 0, 4 do
		local x = -24 + col * 12
		local z = 590 + row * 12
		part({
			Name = "Pedestal" .. btnIndex,
			Size = Vector3.new(3, 3, 3),
			Position = Vector3.new(x, 3.5, z),
			Color = Color3.fromRGB(90, 90, 90),
			Parent = mapButton,
		})
		local btn = part({
			Name = "Button" .. btnIndex,
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(2, 3, 3),
			CFrame = CFrame.new(x, 5.5, z) * CFrame.Angles(0, 0, math.rad(90)),
			Color = Color3.fromRGB(255, 255, 255),
			Material = Enum.Material.SmoothPlastic,
			Parent = mapButton,
		})
		btnIndex += 1
	end
end

-- 3 dim white PointLights
for i, pos in ipairs({ Vector3.new(-20, 18, 600), Vector3.new(0, 18, 600), Vector3.new(20, 18, 600) }) do
	local holder = part({
		Name = "LightHolder" .. i,
		Size = Vector3.new(1, 1, 1),
		Position = pos,
		Transparency = 1,
		CanCollide = false,
		Parent = mapButton,
	})
	local pl = Instance.new("PointLight")
	pl.Brightness = 0.4
	pl.Range = 30
	pl.Color = Color3.fromRGB(255, 255, 255)
	pl.Parent = holder
end

-- 12 spawns in a row at 0,2,570
local buttonSpawns = {}
for i = 0, 11 do
	table.insert(buttonSpawns, Vector3.new(-22 + i * 4, 2, 570))
end
makeSpawns(mapButton, buttonSpawns, 2)

----------------------------------------------------------------------
-- Map_Chase (center 0,1,900)
----------------------------------------------------------------------

local mapChase = Instance.new("Model")
mapChase.Name = "Map_Chase"
mapChase.Parent = maps

part({
	Name = "Floor",
	Size = Vector3.new(200, 2, 30),
	Position = Vector3.new(0, 1, 900),
	Color = Color3.fromRGB(110, 110, 110),
	Parent = mapChase,
})
part({ Name = "WallNorth", Size = Vector3.new(200, 10, 2), Position = Vector3.new(0, 6, 885), Color = Color3.fromRGB(70, 70, 70), Parent = mapChase })
part({ Name = "WallSouth", Size = Vector3.new(200, 10, 2), Position = Vector3.new(0, 6, 915), Color = Color3.fromRGB(70, 70, 70), Parent = mapChase })

local archFolder = Instance.new("Folder")
archFolder.Name = "FinishArch"
archFolder.Parent = mapChase

local pillarL = part({
	Name = "FinishPillarL",
	Size = Vector3.new(2, 12, 2),
	Position = Vector3.new(90, 7, 894),
	Color = Color3.fromRGB(40, 255, 80),
	Material = Enum.Material.Neon,
	Parent = archFolder,
})
local pillarR = part({
	Name = "FinishPillarR",
	Size = Vector3.new(2, 12, 2),
	Position = Vector3.new(90, 7, 906),
	Color = Color3.fromRGB(40, 255, 80),
	Material = Enum.Material.Neon,
	Parent = archFolder,
})
local bar = part({
	Name = "FinishBar",
	Size = Vector3.new(2, 2, 14),
	Position = Vector3.new(90, 14, 900),
	Color = Color3.fromRGB(40, 255, 80),
	Material = Enum.Material.Neon,
	Parent = archFolder,
})
surfaceSign(bar, "FINISH 🏁", Color3.new(1, 1, 1), Color3.fromRGB(10, 80, 20))

-- Invisible kill zone slightly larger than arch
part({
	Name = "ArchKillZone",
	Size = Vector3.new(6, 16, 20),
	Position = Vector3.new(90, 8, 900),
	Transparency = 1,
	CanCollide = false,
	Parent = mapChase,
})

-- 5 neon yellow arrows on floor pointing at arch (toward +X), evenly spaced
for i = 0, 4 do
	local x = -40 + i * 25
	part({
		Name = "Arrow" .. (i + 1),
		Size = Vector3.new(6, 1, 2),
		Position = Vector3.new(x, 2.2, 900),
		Color = Color3.fromRGB(255, 230, 40),
		Material = Enum.Material.Neon,
		Parent = mapChase,
	})
end

makeSpawns(mapChase, gridSpawns(4, 3, Vector3.new(0, 2, 900), 5), 2)

----------------------------------------------------------------------
-- Map_Coins (center 0,1,1200)
----------------------------------------------------------------------

local mapCoins = Instance.new("Model")
mapCoins.Name = "Map_Coins"
mapCoins.Parent = maps

-- 8 rectangular 40x2x15 gray parts rotated in octagon (radius 45)
for i = 0, 7 do
	local angle = (i / 8) * math.pi * 2
	local x = math.cos(angle) * 45
	local z = 1200 + math.sin(angle) * 45
	part({
		Name = "ArenaFloor" .. (i + 1),
		Size = Vector3.new(40, 2, 15),
		CFrame = CFrame.new(x, 1, z) * CFrame.Angles(0, -angle, 0),
		Color = Color3.fromRGB(100, 100, 100),
		Parent = mapCoins,
	})
	-- Low 4-stud walls around edge
	part({
		Name = "ArenaWall" .. (i + 1),
		Size = Vector3.new(40, 4, 1),
		CFrame = CFrame.new(math.cos(angle) * 52, 3, 1200 + math.sin(angle) * 52) * CFrame.Angles(0, -angle, 0),
		Color = Color3.fromRGB(70, 70, 70),
		Parent = mapCoins,
	})
end

-- Center fill so players don't fall through gaps
part({
	Name = "ArenaCenter",
	Size = Vector3.new(70, 2, 70),
	Position = Vector3.new(0, 1, 1200),
	Color = Color3.fromRGB(90, 90, 90),
	Parent = mapCoins,
})

-- 4 raised platforms in quadrants
for i, pos in ipairs({
	Vector3.new(-25, 6, 1175),
	Vector3.new(25, 6, 1175),
	Vector3.new(-25, 6, 1225),
	Vector3.new(25, 6, 1225),
}) do
	part({
		Name = "RaisedPlatform" .. i,
		Size = Vector3.new(15, 4, 15),
		Position = pos,
		Color = Color3.fromRGB(120, 120, 140),
		Parent = mapCoins,
	})
end

local coinsFolder = Instance.new("Folder")
coinsFolder.Name = "Coins"
coinsFolder.Parent = mapCoins

math.randomseed(42) -- deterministic layout for builder
for i = 1, 80 do
	local angle = math.random() * math.pi * 2
	local radius = math.random() * 50
	local x = math.cos(angle) * radius
	local z = 1200 + math.sin(angle) * radius
	local y = 2 + math.random() * 4
	local coin = part({
		Name = "Coin",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(1, 3, 3),
		CFrame = CFrame.new(x, y, z) * CFrame.Angles(0, 0, math.rad(90)),
		Color = Color3.fromRGB(255, 200, 0),
		Material = Enum.Material.Neon,
		CanCollide = false,
		Parent = coinsFolder,
	})
	part({
		Name = "CoinHitbox",
		Size = Vector3.new(4, 4, 4),
		Position = Vector3.new(x, y, z),
		Transparency = 1,
		CanCollide = false,
		Parent = coin,
	})
end

-- 12 spawns around inner edge radius 38
local coinSpawns = {}
for i = 0, 11 do
	local angle = (i / 12) * math.pi * 2
	table.insert(coinSpawns, Vector3.new(math.cos(angle) * 38, 2, 1200 + math.sin(angle) * 38))
end
makeSpawns(mapCoins, coinSpawns, 2)

----------------------------------------------------------------------
-- Map_Swap (center 0,1,1500)
----------------------------------------------------------------------

local mapSwap = Instance.new("Model")
mapSwap.Name = "Map_Swap"
mapSwap.Parent = maps

local redZone = part({
	Name = "RedZone",
	Size = Vector3.new(50, 2, 50),
	Position = Vector3.new(-27, 1, 1500),
	Color = Color3.fromRGB(220, 40, 40),
	Material = Enum.Material.Neon,
	Parent = mapSwap,
})
local blueZone = part({
	Name = "BlueZone",
	Size = Vector3.new(50, 2, 50),
	Position = Vector3.new(27, 1, 1500),
	Color = Color3.fromRGB(40, 100, 255),
	Material = Enum.Material.Neon,
	Parent = mapSwap,
})
part({
	Name = "Bridge",
	Size = Vector3.new(4, 2, 50),
	Position = Vector3.new(0, 1, 1500),
	Color = Color3.fromRGB(40, 40, 40),
	Parent = mapSwap,
})

local redSign = part({
	Name = "RedSign",
	Size = Vector3.new(24, 6, 0.5),
	Position = Vector3.new(-27, 15, 1500),
	Color = Color3.fromRGB(220, 40, 40),
	Parent = mapSwap,
})
surfaceSign(redSign, "RED ZONE ❌", Color3.new(1, 1, 1), Color3.fromRGB(180, 20, 20))

local blueSign = part({
	Name = "BlueSign",
	Size = Vector3.new(24, 6, 0.5),
	Position = Vector3.new(27, 15, 1500),
	Color = Color3.fromRGB(40, 100, 255),
	Parent = mapSwap,
})
surfaceSign(blueSign, "BLUE ZONE ✅", Color3.new(1, 1, 1), Color3.fromRGB(20, 60, 180))

-- 12 spawns in center gap
makeSpawns(mapSwap, gridSpawns(3, 4, Vector3.new(0, 2, 1500), 4), 2)

print("✅ MapBuilder complete — Lobby + 5 maps ready. Parent map mechanic scripts into the matching models.")
