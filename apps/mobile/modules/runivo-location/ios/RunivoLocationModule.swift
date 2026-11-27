// Anti-spoofing: iOS 15+ says whether a location fix was made up by software
// (Xcode location simulation, and the "virtual location" tools that drive it,
// such as iAnyGo or 3uTools). expo-location doesn't expose this on iOS, so the
// run asks here at the start and every couple of minutes.
import ExpoModulesCore
import CoreLocation

/** One-shot location request that reports whether the fix was simulated. */
final class SimulationProbe: NSObject, CLLocationManagerDelegate {
  private let manager = CLLocationManager()
  private var done: ((Bool?) -> Void)?
  private var timeout: DispatchWorkItem?

  func start(_ completion: @escaping (Bool?) -> Void) {
    done = completion
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBest
    let item = DispatchWorkItem { [weak self] in self?.finish(nil) }
    timeout = item
    DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: item)
    manager.requestLocation()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let fix = locations.last else { return finish(nil) }
    if #available(iOS 15.0, *), let info = fix.sourceInformation {
      finish(info.isSimulatedBySoftware)
    } else {
      finish(nil)
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    finish(nil)
  }

  private func finish(_ value: Bool?) {
    timeout?.cancel()
    timeout = nil
    manager.delegate = nil
    let cb = done
    done = nil
    cb?(value)
  }
}

public class RunivoLocationModule: Module {
  // Probes stay alive until they answer.
  private var probes: [SimulationProbe] = []

  public func definition() -> ModuleDefinition {
    Name("RunivoLocation")

    // true: simulated by software. false: a real fix. null: couldn't tell
    // (older iOS, no fix within 15 s, or location unavailable).
    AsyncFunction("isLocationSimulated") { (promise: Promise) in
      let probe = SimulationProbe()
      self.probes.append(probe)
      probe.start { [weak self, weak probe] value in
        if let self = self, let probe = probe { self.probes.removeAll { $0 === probe } }
        promise.resolve(value)
      }
    }.runOnQueue(.main)
  }
}
