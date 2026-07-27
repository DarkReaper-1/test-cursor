import SwiftUI
import UniformTypeIdentifiers
import VitalTrackCore

struct BloodPressureLogView: View {
    @EnvironmentObject private var container: AppContainer
    @Environment(\.dismiss) private var dismiss
    @StateObject private var box = ViewModelBox()
    @State private var showFileImporter = false
    @State private var showDevices = false
    @State private var importResultMessage: String?
    let onSaved: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                if let vm = box.vm {
                    Section("Enter manually") {
                        Text("From your own blood pressure cuff.")
                            .font(.footnote).foregroundStyle(.secondary)
                        LabeledContent("Systolic (top)") {
                            TextField("e.g. 118", text: vm.binding(\.systolicText)).keyboardType(.numberPad).multilineTextAlignment(.trailing)
                        }
                        LabeledContent("Diastolic (bottom)") {
                            TextField("e.g. 76", text: vm.binding(\.diastolicText)).keyboardType(.numberPad).multilineTextAlignment(.trailing)
                        }
                        LabeledContent("Pulse (optional)") {
                            TextField("e.g. 70", text: vm.binding(\.pulseText)).keyboardType(.numberPad).multilineTextAlignment(.trailing)
                        }
                        TextField("Notes (optional)", text: vm.binding(\.notes), axis: .vertical)

                        if let error = vm.errorMessage {
                            Text(error).foregroundStyle(VTColor.danger).font(.footnote)
                        }

                        Button {
                            Task {
                                if await vm.save() {
                                    onSaved()
                                    dismiss()
                                }
                            }
                        } label: {
                            if vm.isSaving { ProgressView() } else { Text("Save reading") }
                        }
                    }

                    Section("Or import") {
                        Button {
                            showDevices = true
                        } label: {
                            Label("Connect a Bluetooth monitor", systemImage: "dot.radiowaves.left.and.right")
                        }
                        Button {
                            showFileImporter = true
                        } label: {
                            Label("Import from CSV", systemImage: "square.and.arrow.down")
                        }
                        if let importResultMessage {
                            Text(importResultMessage).font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Log blood pressure")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .task {
                box.attach(repository: container.repository, healthKit: container.healthKit, settings: container.settings)
            }
            .sheet(isPresented: $showDevices) {
                DevicesView { reading in
                    Task {
                        try? await container.repository.addBloodPressure(reading)
                        onSaved()
                    }
                }
            }
            .fileImporter(isPresented: $showFileImporter, allowedContentTypes: [.commaSeparatedText, .plainText]) { result in
                guard let vm = box.vm else { return }
                switch result {
                case .success(let url):
                    Task {
                        let importResult = await vm.importCsv(from: url)
                        switch importResult {
                        case .success(let count):
                            importResultMessage = "Imported \(count) reading\(count == 1 ? "" : "s")."
                            onSaved()
                        case .failure(let message):
                            importResultMessage = message
                        }
                    }
                case .failure(let error):
                    importResultMessage = error.localizedDescription
                }
            }
        }
    }
}

@MainActor
private final class ViewModelBox: ObservableObject {
    @Published var vm: BloodPressureLogViewModel?
    func attach(repository: any HealthRepository, healthKit: HealthKitManager, settings: SettingsStore) {
        if vm == nil {
            vm = BloodPressureLogViewModel(repository: repository, healthKit: healthKit, settings: settings)
        }
    }
}

private extension BloodPressureLogViewModel {
    /// A tiny manual `Binding` bridge so the Form controls above can bind
    /// directly to `@Published` properties on a reference-type view model.
    func binding(_ keyPath: ReferenceWritableKeyPath<BloodPressureLogViewModel, String>) -> Binding<String> {
        Binding(get: { self[keyPath: keyPath] }, set: { self[keyPath: keyPath] = $0 })
    }
}
