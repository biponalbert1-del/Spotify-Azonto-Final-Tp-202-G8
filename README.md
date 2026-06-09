# Token Transfer App

Application Flutter/Dart pour simuler un portefeuille de jetons evenementiel avec paiement NFC, detection de proximite BLE/Wi-Fi et liste de terminaux autorises.

## Fonctionnalites

- Portefeuille local avec solde en jetons NBP.
- Base de donnees integree SQLite.
- Detection automatique simulee des utilisateurs proches a moins de 4 cm.
- Transfert de jetons entre utilisateurs.
- Historique des transactions.
- Terminaux de paiement autorises pour eviter les abus.
- Service NFC pret a brancher via `nfc_manager`.
- Couche blockchain simulee inspiree de l'abstraction de compte ERC-4337.

## Commandes

```bash
flutter pub get
flutter run
flutter build apk --release
flutter build appbundle --release
```

Les artefacts attendus apres build sont:

- `build/app/outputs/flutter-apk/app-release.apk`
- `build/app/outputs/bundle/release/app-release.aab`
