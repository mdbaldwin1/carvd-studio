import { Monitor, Key, Settings } from "lucide-react";

export default function TroubleshootingSection() {
  return (
    <section id="troubleshooting" className="mt-3xl mb-3xl">
      <h2 className="text-3xl font-bold mb-xl">Troubleshooting</h2>

      {/* Installation Issues */}
      <div className="mb-xl">
        <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
          <Monitor size={20} /> Installation Issues
        </h3>

        <div className="troubleshoot-item">
          <h4 className="troubleshoot-question">
            macOS: "Carvd Studio can't be opened because Apple cannot check it
            for malicious software"
          </h4>
          <div className="troubleshoot-answer">
            <p>
              This is a standard macOS security feature for apps downloaded from
              the internet. To open the app:
            </p>
            <ol className="troubleshoot-steps">
              <li>
                Right-click (or Control-click) on Carvd Studio in your
                Applications folder
              </li>
              <li>Select "Open" from the context menu</li>
              <li>Click "Open" in the dialog that appears</li>
            </ol>
            <p className="text-muted mt-sm">
              You only need to do this once. Future launches will work normally.
            </p>
          </div>
        </div>

        <div className="troubleshoot-item">
          <h4 className="troubleshoot-question">
            Windows: SmartScreen prevented an unrecognized app from starting
          </h4>
          <div className="troubleshoot-answer">
            <p>
              Windows SmartScreen shows this warning for new apps. To proceed:
            </p>
            <ol className="troubleshoot-steps">
              <li>Click "More info" on the SmartScreen dialog</li>
              <li>Click "Run anyway"</li>
            </ol>
            <p className="text-muted mt-sm">
              This warning will disappear as more users install the app and
              Microsoft builds trust with our certificate.
            </p>
          </div>
        </div>

        <div className="troubleshoot-item">
          <h4 className="troubleshoot-question">
            The app won't start or crashes immediately
          </h4>
          <div className="troubleshoot-answer">
            <p>Try these steps:</p>
            <ol className="troubleshoot-steps">
              <li>
                Make sure your system meets the{" "}
                <a href="/download#requirements" className="text-primary">
                  minimum requirements
                </a>
              </li>
              <li>Restart your computer and try again</li>
              <li>
                Reinstall the app from the{" "}
                <a href="/download" className="text-primary">
                  download page
                </a>
              </li>
              <li>
                Check if your antivirus is blocking the app and add an exception
                if needed
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* License Issues */}
      <div className="mb-xl">
        <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
          <Key size={20} /> License & Activation
        </h3>

        <div className="troubleshoot-item">
          <h4 className="troubleshoot-question">
            My license key isn't working
          </h4>
          <div className="troubleshoot-answer">
            <p>If your license key is rejected:</p>
            <ol className="troubleshoot-steps">
              <li>
                Check for typos - copy and paste the key directly from your
                email
              </li>
              <li>Make sure you're connected to the internet</li>
              <li>
                Check that you haven't exceeded the activation limit (3 devices)
              </li>
              <li>
                If you've reached the limit, deactivate an old device first in
                Settings → License
              </li>
            </ol>
          </div>
        </div>

        <div className="troubleshoot-item">
          <h4 className="troubleshoot-question">
            I need to move my license to a new computer
          </h4>
          <div className="troubleshoot-answer">
            <p>
              You can activate your license on up to 3 computers. To move it:
            </p>
            <ol className="troubleshoot-steps">
              <li>On your old computer, go to Settings → License</li>
              <li>Click "Deactivate License"</li>
              <li>
                On your new computer, enter your license key in Settings →
                License
              </li>
            </ol>
            <p className="text-muted mt-sm">
              If you no longer have access to the old computer,{" "}
              <a href="#contact" className="text-primary">
                contact us
              </a>{" "}
              and we can reset your activations.
            </p>
          </div>
        </div>

        <div className="troubleshoot-item">
          <h4 className="troubleshoot-question">
            My trial expired but I wasn't done evaluating
          </h4>
          <div className="troubleshoot-answer">
            <p>
              We understand!{" "}
              <a href="#contact" className="text-primary">
                Contact us
              </a>{" "}
              and we'll extend your trial so you have enough time to evaluate
              all the features.
            </p>
          </div>
        </div>
      </div>

      {/* App Issues */}
      <div className="mb-xl">
        <h3 className="text-xl font-bold mb-md flex items-center gap-sm">
          <Settings size={20} /> App Issues
        </h3>

        <div className="troubleshoot-item">
          <h4 className="troubleshoot-question">My project file won't open</h4>
          <div className="troubleshoot-answer">
            <p>If a project file won't open:</p>
            <ol className="troubleshoot-steps">
              <li>Check if the file has a .carvd extension</li>
              <li>
                Try opening the auto-recovery version: File → Recover Auto-Saved
                Project
              </li>
              <li>
                Make sure the file isn't on a network drive or cloud storage
                that's offline
              </li>
            </ol>
            <p className="text-muted mt-sm">
              If the file is corrupted,{" "}
              <a href="#contact" className="text-primary">
                contact us
              </a>{" "}
              with the file attached and we may be able to recover it.
            </p>
          </div>
        </div>

        <div className="troubleshoot-item">
          <h4 className="troubleshoot-question">
            The 3D view is slow or laggy
          </h4>
          <div className="troubleshoot-answer">
            <p>Performance issues can usually be improved by:</p>
            <ol className="troubleshoot-steps">
              <li>Closing other applications to free up memory</li>
              <li>
                Reducing the number of visible parts (use groups to hide
                sections)
              </li>
              <li>Making sure your graphics drivers are up to date</li>
              <li>
                On laptops, ensuring you're plugged in (battery mode reduces
                performance)
              </li>
            </ol>
          </div>
        </div>

        <div className="troubleshoot-item">
          <h4 className="troubleshoot-question">
            Cut list calculations seem wrong
          </h4>
          <div className="troubleshoot-answer">
            <p>Double-check these settings:</p>
            <ol className="troubleshoot-steps">
              <li>
                Verify your stock dimensions are correct in the Stock Library
              </li>
              <li>
                Check the kerf (blade width) setting in your project settings
              </li>
              <li>
                Make sure grain direction is set correctly on grain-sensitive
                parts
              </li>
              <li>Confirm units are consistent (all inches or all mm)</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
