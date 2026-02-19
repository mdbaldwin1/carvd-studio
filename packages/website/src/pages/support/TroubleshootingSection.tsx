import { Monitor, Key, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function TroubleshootingSection() {
  return (
    <section id="troubleshooting" className="mt-16 mb-16">
      <h2 className="mb-12 text-3xl font-bold">Troubleshooting</h2>

      {/* Installation Issues */}
      <div className="mb-12">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Monitor size={20} /> Installation Issues
        </h3>

        <Card className="mb-4 p-8 last:mb-0 max-md:p-6 max-sm:p-4">
          <h4 className="mb-4 text-lg font-bold max-md:text-base max-sm:text-sm">
            macOS: "Carvd Studio can't be opened because Apple cannot check it
            for malicious software"
          </h4>
          <div className="leading-relaxed text-text-muted max-sm:text-sm">
            <p className="mb-2">
              This is a standard macOS security feature for apps downloaded from
              the internet. To open the app:
            </p>
            <ol className="my-4 list-none p-0 [counter-reset:step-counter]">
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Right-click (or Control-click) on Carvd Studio in your
                Applications folder
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Select "Open" from the context menu
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] max-sm:pl-6">
                Click "Open" in the dialog that appears
              </li>
            </ol>
            <p className="mt-2 text-text-muted">
              You only need to do this once. Future launches will work normally.
            </p>
          </div>
        </Card>

        <Card className="mb-4 p-8 last:mb-0 max-md:p-6 max-sm:p-4">
          <h4 className="mb-4 text-lg font-bold max-md:text-base max-sm:text-sm">
            Windows: SmartScreen prevented an unrecognized app from starting
          </h4>
          <div className="leading-relaxed text-text-muted max-sm:text-sm">
            <p className="mb-2">
              Windows SmartScreen shows this warning for new apps. To proceed:
            </p>
            <ol className="my-4 list-none p-0 [counter-reset:step-counter]">
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Click "More info" on the SmartScreen dialog
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] max-sm:pl-6">
                Click "Run anyway"
              </li>
            </ol>
            <p className="mt-2 text-text-muted">
              This warning will disappear as more users install the app and
              Microsoft builds trust with our certificate.
            </p>
          </div>
        </Card>

        <Card className="p-8 max-md:p-6 max-sm:p-4">
          <h4 className="mb-4 text-lg font-bold max-md:text-base max-sm:text-sm">
            The app won't start or crashes immediately
          </h4>
          <div className="leading-relaxed text-text-muted max-sm:text-sm">
            <p className="mb-2">Try these steps:</p>
            <ol className="my-4 list-none p-0 [counter-reset:step-counter]">
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Make sure your system meets the{" "}
                <a
                  href="/download#requirements"
                  className="text-primary-text hover:underline"
                >
                  minimum requirements
                </a>
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Restart your computer and try again
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Reinstall the app from the{" "}
                <a
                  href="/download"
                  className="text-primary-text hover:underline"
                >
                  download page
                </a>
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] max-sm:pl-6">
                Check if your antivirus is blocking the app and add an exception
                if needed
              </li>
            </ol>
          </div>
        </Card>
      </div>

      {/* License Issues */}
      <div className="mb-12">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Key size={20} /> License & Activation
        </h3>

        <Card className="mb-4 p-8 last:mb-0 max-md:p-6 max-sm:p-4">
          <h4 className="mb-4 text-lg font-bold max-md:text-base max-sm:text-sm">
            My license key isn't working
          </h4>
          <div className="leading-relaxed text-text-muted max-sm:text-sm">
            <p className="mb-2">If your license key is rejected:</p>
            <ol className="my-4 list-none p-0 [counter-reset:step-counter]">
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Check for typos - copy and paste the key directly from your
                email
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Make sure you're connected to the internet
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Check that you haven't exceeded the activation limit (3 devices)
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] max-sm:pl-6">
                If you've reached the limit, deactivate an old device first in
                Settings → License
              </li>
            </ol>
          </div>
        </Card>

        <Card className="mb-4 p-8 last:mb-0 max-md:p-6 max-sm:p-4">
          <h4 className="mb-4 text-lg font-bold max-md:text-base max-sm:text-sm">
            I need to move my license to a new computer
          </h4>
          <div className="leading-relaxed text-text-muted max-sm:text-sm">
            <p className="mb-2">
              You can activate your license on up to 3 computers. To move it:
            </p>
            <ol className="my-4 list-none p-0 [counter-reset:step-counter]">
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                On your old computer, go to Settings → License
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Click "Deactivate License"
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] max-sm:pl-6">
                On your new computer, enter your license key in Settings →
                License
              </li>
            </ol>
            <p className="mt-2 text-text-muted">
              If you no longer have access to the old computer,{" "}
              <a href="#contact" className="text-primary-text hover:underline">
                contact us
              </a>{" "}
              and we can reset your activations.
            </p>
          </div>
        </Card>

        <Card className="p-8 max-md:p-6 max-sm:p-4">
          <h4 className="mb-4 text-lg font-bold max-md:text-base max-sm:text-sm">
            My trial expired but I wasn't done evaluating
          </h4>
          <div className="leading-relaxed text-text-muted max-sm:text-sm">
            <p>
              We understand!{" "}
              <a href="#contact" className="text-primary-text hover:underline">
                Contact us
              </a>{" "}
              and we'll extend your trial so you have enough time to evaluate
              all the features.
            </p>
          </div>
        </Card>
      </div>

      {/* App Issues */}
      <div className="mb-12">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Settings size={20} /> App Issues
        </h3>

        <Card className="mb-4 p-8 last:mb-0 max-md:p-6 max-sm:p-4">
          <h4 className="mb-4 text-lg font-bold max-md:text-base max-sm:text-sm">
            My project file won't open
          </h4>
          <div className="leading-relaxed text-text-muted max-sm:text-sm">
            <p className="mb-2">If a project file won't open:</p>
            <ol className="my-4 list-none p-0 [counter-reset:step-counter]">
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Check if the file has a .carvd extension
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Try opening the auto-recovery version: File → Recover Auto-Saved
                Project
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] max-sm:pl-6">
                Make sure the file isn't on a network drive or cloud storage
                that's offline
              </li>
            </ol>
            <p className="mt-2 text-text-muted">
              If the file is corrupted,{" "}
              <a href="#contact" className="text-primary-text hover:underline">
                contact us
              </a>{" "}
              with the file attached and we may be able to recover it.
            </p>
          </div>
        </Card>

        <Card className="mb-4 p-8 last:mb-0 max-md:p-6 max-sm:p-4">
          <h4 className="mb-4 text-lg font-bold max-md:text-base max-sm:text-sm">
            The 3D view is slow or laggy
          </h4>
          <div className="leading-relaxed text-text-muted max-sm:text-sm">
            <p className="mb-2">
              Performance issues can usually be improved by:
            </p>
            <ol className="my-4 list-none p-0 [counter-reset:step-counter]">
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Closing other applications to free up memory
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Reducing the number of visible parts (use groups to hide
                sections)
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Making sure your graphics drivers are up to date
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] max-sm:pl-6">
                On laptops, ensuring you're plugged in (battery mode reduces
                performance)
              </li>
            </ol>
          </div>
        </Card>

        <Card className="p-8 max-md:p-6 max-sm:p-4">
          <h4 className="mb-4 text-lg font-bold max-md:text-base max-sm:text-sm">
            Cut list calculations seem wrong
          </h4>
          <div className="leading-relaxed text-text-muted max-sm:text-sm">
            <p className="mb-2">Double-check these settings:</p>
            <ol className="my-4 list-none p-0 [counter-reset:step-counter]">
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Verify your stock dimensions are correct in the Stock Library
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Check the kerf (blade width) setting in your project settings
              </li>
              <li className="relative mb-2 pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] last:mb-0 max-sm:pl-6">
                Make sure grain direction is set correctly on grain-sensitive
                parts
              </li>
              <li className="relative pl-8 before:absolute before:left-0 before:font-semibold before:text-accent before:content-[counter(step-counter)'.'] [counter-increment:step-counter] max-sm:pl-6">
                Confirm units are consistent (all inches or all mm)
              </li>
            </ol>
          </div>
        </Card>
      </div>
    </section>
  );
}
