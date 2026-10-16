import Foundation
import Virtualization

// Trusted host helper. No NIC, sockets, host shares, clipboard or agent channel.
// Guest code is never executed by the macOS process.
struct Job: Decodable {
    let kernel: String
    let initrd: String
    let disk: String
    let input: String
}

final class Delegate: NSObject, VZVirtualMachineDelegate {
    func guestDidStop(_ virtualMachine: VZVirtualMachine) { exit(0) }
    func virtualMachine(_ virtualMachine: VZVirtualMachine, didStopWithError error: Error) {
        FileHandle.standardError.write(Data("Virtual machine stopped with error\n".utf8))
        exit(2)
    }
}

func main() throws {
    guard CommandLine.arguments.count == 2 else { throw NSError(domain: "local-ci", code: 1) }
    let job = try JSONDecoder().decode(Job.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
    let config = VZVirtualMachineConfiguration()
    let boot = VZLinuxBootLoader(kernelURL: URL(fileURLWithPath: job.kernel))
    boot.initialRamdiskURL = URL(fileURLWithPath: job.initrd)
    boot.commandLine = "console=hvc0 root=/dev/vda rw panic=1 systemd.unit=local-ci.target"
    config.bootLoader = boot
    config.cpuCount = 4
    config.memorySize = 6 * 1024 * 1024 * 1024
    config.networkDevices = []
    config.directorySharingDevices = []
    config.socketDevices = []
    config.entropyDevices = [VZVirtioEntropyDeviceConfiguration()]
    config.memoryBalloonDevices = [VZVirtioTraditionalMemoryBalloonDeviceConfiguration()]
    config.storageDevices = try [(job.disk, false), (job.input, true)].map { path, readOnly in
        VZVirtioBlockDeviceConfiguration(attachment: try VZDiskImageStorageDeviceAttachment(url: URL(fileURLWithPath: path), readOnly: readOnly))
    }
    let console = VZVirtioConsoleDeviceSerialPortConfiguration()
    console.attachment = VZFileHandleSerialPortAttachment(fileHandleForReading: nil, fileHandleForWriting: .standardOutput)
    let control = VZVirtioConsoleDeviceSerialPortConfiguration()
    control.attachment = VZFileHandleSerialPortAttachment(fileHandleForReading: nil, fileHandleForWriting: .standardError)
    config.serialPorts = [console, control]
    try config.validate()
    let vm = VZVirtualMachine(configuration: config)
    let delegate = Delegate()
    vm.delegate = delegate
    // The supervisor's pipe closes on crash; process exit tears down the VM.
    FileHandle.standardInput.readabilityHandler = { handle in
        if handle.availableData.isEmpty { exit(3) }
    }
    vm.start { result in
        if case .failure = result { exit(2) }
    }
    withExtendedLifetime((vm, delegate)) { RunLoop.main.run() }
}

do { try main() }
catch {
    FileHandle.standardError.write(Data("Invalid virtual machine configuration\n".utf8))
    exit(2)
}
