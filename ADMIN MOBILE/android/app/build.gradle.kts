plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.nsp_pos_mobile"
    compileSdk = 34  // ou flutter.compileSdkVersion

    ndkVersion = "25.1.8937393"  // version stable pour SQLCipher

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    defaultConfig {
        applicationId = "com.nsp_pos_mobile"
        minSdk = 21  // ← SQLCipher nécessite API 21 minimum
        targetSdk = 34
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        // Support des architectures pour SQLCipher
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("debug")
            // Pour la release, ajoutez votre propre signingConfig
        }
    }
}

flutter {
    source = "../.."
}