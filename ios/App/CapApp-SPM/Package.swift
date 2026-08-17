// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.2"),
        .package(name: "CapacitorFirebaseApp", path: "LocalPackages/CapacitorFirebaseApp"),
        .package(name: "CapacitorFirebaseCrashlytics", path: "LocalPackages/CapacitorFirebaseCrashlytics"),
        .package(name: "CapacitorApp", path: "LocalPackages/CapacitorApp"),
        .package(name: "CapacitorHaptics", path: "LocalPackages/CapacitorHaptics"),
        .package(name: "CapacitorLocalNotifications", path: "LocalPackages/CapacitorLocalNotifications"),
        .package(name: "CapacitorSplashScreen", path: "LocalPackages/CapacitorSplashScreen"),
        .package(name: "RevenuecatPurchasesCapacitor", path: "LocalPackages/RevenuecatPurchasesCapacitor"),
        .package(name: "SentryCapacitor", path: "LocalPackages/SentryCapacitor")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorFirebaseApp", package: "CapacitorFirebaseApp"),
                .product(name: "CapacitorFirebaseCrashlytics", package: "CapacitorFirebaseCrashlytics"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorHaptics", package: "CapacitorHaptics"),
                .product(name: "CapacitorLocalNotifications", package: "CapacitorLocalNotifications"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "RevenuecatPurchasesCapacitor", package: "RevenuecatPurchasesCapacitor"),
                .product(name: "SentryCapacitor", package: "SentryCapacitor")
            ]
        )
    ]
)
