import {
  BarChart,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  PieChart,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
} from "cursor/canvas";

type ProjectKind = "Mobile" | "Web" | "Native" | "Security";

type Project = {
  id: string;
  name: string;
  kind: ProjectKind;
  path: string;
  files: number;
  stack: string;
  summary: string;
  howToRun: string;
};

const PROJECTS: Project[] = [
  {
    id: "halal",
    name: "Halal Detector",
    kind: "Mobile",
    path: "halal-detector/",
    files: 80,
    stack: "Expo + FastAPI",
    summary:
      "Accessible Halal / Doubtful / Haram scanner with offline E-numbers, OCR, barcode, and AI chat.",
    howToRun: "cd halal-detector/backend && uvicorn … · npx expo start",
  },
  {
    id: "vital",
    name: "VitalTrack AI",
    kind: "Native",
    path: "VitalTrackAI/",
    files: 119,
    stack: "SwiftUI + HealthKit",
    summary:
      "Trust-first iOS cardiovascular tracker — camera PPG HR, honest BP logging from FDA-cleared monitors only.",
    howToRun: "cd VitalTrackAI && ./Scripts/generate-xcodeproj.sh",
  },
  {
    id: "solo",
    name: "Solo Health",
    kind: "Web",
    path: "solo-health/",
    files: 12,
    stack: "HTML + MediaPipe",
    summary:
      "Solo Leveling–inspired trainer with ranks, Daily Quests, Penalty Quests, and a pose-tracking camera scanner.",
    howToRun: "python3 -m http.server 8765 --directory ..",
  },
  {
    id: "swing",
    name: "Spider-Man Web Swing",
    kind: "Web",
    path: "index.html + js/",
    files: 6,
    stack: "HTML5 Canvas",
    summary:
      "Browser web-swinging game with pendulum rope physics, procedural skyline, and side-scrolling camera.",
    howToRun: "python3 -m http.server 8080 → http://localhost:8080",
  },
  {
    id: "ios3d",
    name: "SpiderSwing 3D",
    kind: "Native",
    path: "ios/SpiderSwing3D/",
    files: 18,
    stack: "SceneKit",
    summary: "Native iOS 3D web-swing experience built with SceneKit.",
    howToRun: "Open the Xcode project under ios/SpiderSwing3D/",
  },
  {
    id: "square",
    name: "Square RE Toolkit",
    kind: "Security",
    path: "scripts/ + frida/ + docs/",
    files: 12,
    stack: "jadx · apktool · Frida",
    summary:
      "Educational reverse-engineering pipeline for authorized Square Android app analysis.",
    howToRun: "./scripts/setup.sh && ./scripts/analyze.sh apks/…",
  },
];

const KINDS: Array<ProjectKind | "All"> = [
  "All",
  "Mobile",
  "Web",
  "Native",
  "Security",
];

const kindTone = (
  kind: ProjectKind,
): "info" | "success" | "warning" | "added" | "neutral" => {
  switch (kind) {
    case "Mobile":
      return "info";
    case "Web":
      return "success";
    case "Native":
      return "added";
    case "Security":
      return "warning";
    default:
      return "neutral";
  }
};

export default function RepoOverviewCanvas() {
  const [filter, setFilter] = useCanvasState<ProjectKind | "All">(
    "kind-filter",
    "All",
  );
  const [selectedId, setSelectedId] = useCanvasState<string>(
    "selected-project",
    "halal",
  );

  const visible =
    filter === "All" ? PROJECTS : PROJECTS.filter((p) => p.kind === filter);
  const selected =
    visible.find((p) => p.id === selectedId) ?? visible[0] ?? PROJECTS[0];

  const totalFiles = PROJECTS.reduce((sum, p) => sum + p.files, 0);
  const byKind = (["Mobile", "Web", "Native", "Security"] as ProjectKind[]).map(
    (kind) => ({
      label: kind,
      value: PROJECTS.filter((p) => p.kind === kind).length,
    }),
  );

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>test-cursor</H1>
        <Text tone="secondary">
          Interactive map of the independent projects in this repository —
          filter by kind, scan the file mix, and focus a project for run
          instructions.
        </Text>
      </Stack>

      <Grid columns={4} gap={16}>
        <Stat value={String(PROJECTS.length)} label="Projects" />
        <Stat value={String(totalFiles)} label="Tracked files" tone="info" />
        <Stat value="5" label="Stacks" />
        <Stat value="2" label="Platforms (iOS + web)" tone="success" />
      </Grid>

      <Callout tone="info" title="About this canvas">
        Built with `cursor/canvas` primitives (`Stat`, `Table`, `PieChart`,
        `BarChart`, `Pill`, `Card`). Filters and selection persist via
        `useCanvasState`.
      </Callout>

      <Stack gap={12}>
        <H2>Filter by kind</H2>
        <Row gap={8} wrap>
          {KINDS.map((kind) => (
            <Pill
              key={kind}
              active={filter === kind}
              tone={kind === "All" ? "neutral" : kindTone(kind as ProjectKind)}
              onClick={() => {
                setFilter(kind);
                const next =
                  kind === "All"
                    ? PROJECTS
                    : PROJECTS.filter((p) => p.kind === kind);
                if (next.length > 0 && !next.some((p) => p.id === selectedId)) {
                  setSelectedId(next[0].id);
                }
              }}
            >
              {kind}
            </Pill>
          ))}
        </Row>
      </Stack>

      <Grid columns={2} gap={16}>
        <Stack gap={8}>
          <H2>Projects by kind</H2>
          <PieChart data={byKind} donut size={220} />
        </Stack>
        <Stack gap={8}>
          <H2>Files per project</H2>
          <BarChart
            categories={PROJECTS.map((p) => p.name.split(" ")[0])}
            series={[
              {
                name: "Files",
                data: PROJECTS.map((p) => p.files),
              },
            ]}
            height={220}
          />
        </Stack>
      </Grid>

      <Stack gap={12}>
        <H2>Project catalog</H2>
        <Text tone="secondary">
          Select a project, then review the focused card below. Showing{" "}
          {visible.length} of {PROJECTS.length}.
        </Text>
        <Row gap={8} wrap>
          {visible.map((p) => (
            <Pill
              key={p.id}
              active={p.id === selected.id}
              tone={kindTone(p.kind)}
              onClick={() => setSelectedId(p.id)}
            >
              {p.name}
            </Pill>
          ))}
        </Row>
        <Table
          headers={["Name", "Kind", "Stack", "Files", "Path", ""]}
          columnAlign={["left", "left", "left", "right", "left", "right"]}
          rows={visible.map((p) => [
            <Text weight={p.id === selected.id ? "semibold" : "normal"}>
              {p.name}
            </Text>,
            <Pill size="sm" tone={kindTone(p.kind)} active>
              {p.kind}
            </Pill>,
            p.stack,
            String(p.files),
            <Text tone="secondary">{p.path}</Text>,
            <Button
              variant={p.id === selected.id ? "primary" : "ghost"}
              onClick={() => setSelectedId(p.id)}
            >
              {p.id === selected.id ? "Focused" : "Focus"}
            </Button>,
          ])}
          rowTone={visible.map((p) =>
            p.id === selected.id ? ("info" as const) : undefined,
          )}
          striped
        />
      </Stack>

      <Stack gap={12}>
        <H2>Focused project</H2>
        <Card>
          <CardHeader
            trailing={
              <Pill size="sm" tone={kindTone(selected.kind)} active>
                {selected.kind}
              </Pill>
            }
          >
            {selected.name}
          </CardHeader>
          <CardBody>
            <Stack gap={12}>
              <Text>{selected.summary}</Text>
              <Divider />
              <Grid columns={2} gap={12}>
                <Stack gap={4}>
                  <H3>Stack</H3>
                  <Text tone="secondary">{selected.stack}</Text>
                </Stack>
                <Stack gap={4}>
                  <H3>Path</H3>
                  <Text tone="secondary">{selected.path}</Text>
                </Stack>
              </Grid>
              <Stack gap={4}>
                <H3>How to run</H3>
                <Text tone="secondary">{selected.howToRun}</Text>
              </Stack>
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Stack gap={8}>
        <H2>Repo layout</H2>
        <Table
          headers={["Top-level", "Role"]}
          rows={[
            ["halal-detector/", "Expo mobile + FastAPI backend"],
            ["VitalTrackAI/", "SwiftUI iOS app + docs + tests"],
            ["solo-health/", "Browser health RPG + camera scanner"],
            ["index.html · js/ · style.css", "Spider-Man web-swing game"],
            ["ios/", "Native SceneKit 3D swing prototype"],
            ["scripts/ · frida/ · docs/ · apks/", "Square RE toolkit"],
            [".cursor/canvases/", "Interactive Cursor canvases"],
          ]}
        />
      </Stack>
    </Stack>
  );
}
