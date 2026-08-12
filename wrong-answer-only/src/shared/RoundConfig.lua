--[[
	RoundConfig (ModuleScript — ReplicatedStorage)
	Defines all five rounds for "Wrong Answer Only": fake rules, real rules,
	map assignments, timers, and reveal copy. Shared by server and client.
]]

local RoundConfig = {}

-- Exact reason strings used by EliminationHandler (must stay in sync)
RoundConfig.REASONS = {
	WrongPlatform = "Touched the wrong platform",
	WrongButton = "Pressed the wrong button",
	WrongDirection = "Ran the wrong direction",
	ForbiddenCoin = "Collected a forbidden coin",
	CouldNotAdapt = "Could not adapt in time",
	OutOfBounds = "Fell out of bounds",
}

--[[
	Round table — indexed 1..5.
	fakeRule  = the LIE shown to players (doing this eliminates you)
	realRule  = internal truth used by mechanics / reveal text
	timeLimit = seconds until round ends
	revealText = shown after RoundEnded so survivors learn the twist
]]
RoundConfig.Rounds = {
	{
		roundNumber = 1,
		roundName = "Platform Panic",
		mapName = "Map_Platform",
		fakeRule = "STEP ON THE SAFE PLATFORM ✅",
		realRule = "Green SafePlatform kills; red DangerPlatform is actually safe.",
		timeLimit = 30,
		revealText = "😱 TWIST: The green 'SAFE' platform was lava! Red was safe all along.",
		timeoutReason = RoundConfig.REASONS.WrongPlatform,
	},
	{
		roundNumber = 2,
		roundName = "Button Roulette",
		mapName = "Map_Button",
		fakeRule = "DO NOT PRESS ANY BUTTONS ⛔",
		realRule = "Exactly one button is correct — press it to survive. All others kill.",
		timeLimit = 40,
		revealText = "😱 TWIST: One button saved you! Standing still got you eliminated.",
		timeoutReason = RoundConfig.REASONS.WrongButton,
	},
	{
		roundNumber = 3,
		roundName = "Chase the Finish?",
		mapName = "Map_Chase",
		fakeRule = "REACH THE FINISH LINE TO WIN 🏁",
		realRule = "The finish arch chases you. Run AWAY to survive.",
		timeLimit = 60,
		revealText = "😱 TWIST: The finish line was hunting YOU! Running away was survival.",
		timeoutReason = RoundConfig.REASONS.WrongDirection,
	},
	{
		roundNumber = 4,
		roundName = "Coin Curse",
		mapName = "Map_Coins",
		fakeRule = "COLLECT 10 COINS TO SURVIVE 🪙",
		realRule = "Every coin is a trap — touch any and you're out.",
		timeLimit = 45,
		revealText = "😱 TWIST: Every coin was deadly! Avoiding them kept you alive.",
		timeoutReason = RoundConfig.REASONS.ForbiddenCoin,
	},
	{
		roundNumber = 5,
		roundName = "Zone Swap",
		mapName = "Map_Swap",
		fakeRule = "STAY IN THE BLUE ZONE ✅",
		realRule = "Safe zone swaps at 20s (5s grace) and 40s (3s grace).",
		timeLimit = 60,
		revealText = "😱 TWIST: Zones swapped mid-round! You had to adapt or die.",
		timeoutReason = RoundConfig.REASONS.CouldNotAdapt,
	},
}

----------------------------------------------------------------------
-- Helpers
----------------------------------------------------------------------

function RoundConfig.GetTotalRounds(): number
	return #RoundConfig.Rounds
end

function RoundConfig.GetRound(roundNumber: number)
	return RoundConfig.Rounds[roundNumber]
end

function RoundConfig.GetMapName(roundNumber: number): string?
	local round = RoundConfig.Rounds[roundNumber]
	return if round then round.mapName else nil
end

function RoundConfig.GetFakeRule(roundNumber: number): string?
	local round = RoundConfig.Rounds[roundNumber]
	return if round then round.fakeRule else nil
end

function RoundConfig.GetRealRule(roundNumber: number): string?
	local round = RoundConfig.Rounds[roundNumber]
	return if round then round.realRule else nil
end

function RoundConfig.GetTimeLimit(roundNumber: number): number?
	local round = RoundConfig.Rounds[roundNumber]
	return if round then round.timeLimit else nil
end

function RoundConfig.GetRevealText(roundNumber: number): string?
	local round = RoundConfig.Rounds[roundNumber]
	return if round then round.revealText else nil
end

function RoundConfig.GetTimeoutReason(roundNumber: number): string
	local round = RoundConfig.Rounds[roundNumber]
	if round and round.timeoutReason then
		return round.timeoutReason
	end
	return RoundConfig.REASONS.CouldNotAdapt
end

return RoundConfig
