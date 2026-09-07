import UIKit
import Capacitor

final class ASHBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        let ashBackground = UIColor(red: 8.0 / 255.0, green: 8.0 / 255.0, blue: 18.0 / 255.0, alpha: 1.0)
        view.backgroundColor = ashBackground
        webView?.backgroundColor = ashBackground
        webView?.scrollView.backgroundColor = ashBackground
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }

    // Stretch the web view over the full window, including the home-indicator
    // area, so no blank strip can show under the tab bar.
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        webView?.frame = view.bounds
    }
}


class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = UIColor(red: 8.0 / 255.0, green: 8.0 / 255.0, blue: 18.0 / 255.0, alpha: 1.0)
        window?.rootViewController = ASHBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
