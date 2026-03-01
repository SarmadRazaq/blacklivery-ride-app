import Flutter
import UIKit
import GoogleMaps
import FirebaseCore
import FirebaseMessaging

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Initialize Firebase
    FirebaseApp.configure()

    // Read API key from Info.plist (injected via xcconfig at build time)
    if let apiKey = Bundle.main.infoDictionary?["GOOGLE_MAPS_API_KEY"] as? String, !apiKey.isEmpty {
      GMSServices.provideAPIKey(apiKey)
    }

    // Register for remote notifications (required for FCM on iOS)
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
      Messaging.messaging().delegate = self
    }
    application.registerForRemoteNotifications()

    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
