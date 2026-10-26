import java.io.File;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.cert.Certificate;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.jar.JarFile;

/** Verify every payload entry and its signer against the existing upload key. */
class VerifyAndroidBundle {
    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isEmpty()) throw new IllegalStateException("Missing signing input: " + name);
        return value;
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 1) throw new IllegalArgumentException("Expected an AAB path.");
        char[] password = required("CM_KEYSTORE_PASSWORD").toCharArray();
        KeyStore store;
        try {
            store = KeyStore.getInstance(new File(required("CM_KEYSTORE_PATH")), password);
        } finally {
            Arrays.fill(password, '\0');
        }
        Certificate expected = store.getCertificate(required("CM_KEY_ALIAS"));
        if (expected == null) throw new IllegalStateException("Upload signing alias has no certificate.");
        int verified = 0;
        try (JarFile bundle = new JarFile(args[0], true)) {
            var entries = bundle.entries();
            while (entries.hasMoreElements()) {
                var entry = entries.nextElement();
                if (entry.isDirectory()) continue;
                // Only JAR signing metadata is exempt from payload verification.
                String name = entry.getName().toUpperCase(java.util.Locale.ROOT);
                if (name.equals("META-INF/MANIFEST.MF") || name.matches("META-INF/[^/]+\\.(SF|RSA|DSA|EC)")) continue;
                try (var stream = bundle.getInputStream(entry)) {
                    stream.transferTo(java.io.OutputStream.nullOutputStream());
                }
                var signers = entry.getCodeSigners();
                if (signers == null || signers.length != 1 ||
                    !expected.equals(signers[0].getSignerCertPath().getCertificates().get(0))) {
                    throw new SecurityException("Unsigned payload or unexpected upload signing certificate.");
                }
                verified++;
            }
        }
        if (verified == 0) throw new SecurityException("Bundle contains no signed payload.");
        String fingerprint = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(expected.getEncoded()));
        System.out.println("Verified every payload signature against the configured upload key. Certificate SHA-256: " + fingerprint);
    }
}