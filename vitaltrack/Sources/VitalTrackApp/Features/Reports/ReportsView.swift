import SwiftUI
import VitalTrackCore

struct ReportsView: View {
    @EnvironmentObject private var container: AppContainer
    @State private var isExporting = false
    @State private var exportedFile: ExportedFile?
    @State private var errorMessage: String?

    private struct ExportedFile: Identifiable {
        let url: URL
        var id: String { url.path }
    }

    var body: some View {
        List {
            Section {
                Text("Generate a report from everything you've logged so far. Nothing is sent "
                    + "anywhere automatically — you choose how to share the file after it's created.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section("Export") {
                ForEach(ExportFormat.allCases) { format in
                    Button {
                        export(format)
                    } label: {
                        HStack {
                            Text(format.displayName)
                            Spacer()
                            if isExporting { ProgressView() }
                        }
                    }
                    .disabled(isExporting)
                }
            }
            if let errorMessage {
                Section {
                    Text(errorMessage).foregroundStyle(VTColor.danger)
                }
            }
        }
        .navigationTitle("Reports")
        .sheet(item: $exportedFile) { file in
            ShareSheet(activityItems: [file.url])
        }
    }

    private func export(_ format: ExportFormat) {
        isExporting = true
        errorMessage = nil
        Task {
            defer { isExporting = false }
            do {
                let url = try await container.exportManager.export(format)
                exportedFile = ExportedFile(url: url)
            } catch {
                errorMessage = "Couldn't generate the report: \(error.localizedDescription)"
            }
        }
    }
}

private struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
