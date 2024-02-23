export class IframeClient {
    private readonly _iframe: HTMLIFrameElement;
    constructor(accessToken: string) {
        if (!document) {
            throw new Error("must be run in a browser");
        }

        this._iframe = document.createElement("iframe");
        this._iframe.src = (process.env.IFRAME_URL || "http://localhost:300") + "/iframe?accessToken=" + accessToken;
        this._iframe.style.display = "none";
        document.body.appendChild(this._iframe);
    }

    private waitForIframeLoad(): Promise<void> {
        if (!this._iframe.contentWindow) {
            return new Promise((resolve) => {
                this._iframe.onload = () => {
                    resolve();
                };
            });
        }

        return Promise.resolve();
    }

    async createAccount(auth: string, password?: string): Promise<string> {
        await this.waitForIframeLoad();

        return new Promise((resolve, reject) => {
            // Function to handle message event
            const handleMessage = (event: MessageEvent) => {
                if (event.data.action === "keyGenerated") {
                    if (event.data.success) {
                        resolve(event.data.deviceId);
                    } else {
                        reject(new Error(event.data.error || "Key generation failed"));
                    }

                    window.removeEventListener("message", handleMessage);
                }
            };

            window.addEventListener("message", handleMessage);

            this._iframe.contentWindow?.postMessage({
                action: "generateKey",
                auth: auth,
                password: password,
            }, "*");
        });
    }

    async registerDevice(auth: string, password?: string): Promise<string> {
        await this.waitForIframeLoad();

        return new Promise((resolve, reject) => {
            // Function to handle message event
            const handleMessage = (event: MessageEvent) => {
                if (event.data.action === "deviceRegistered") {
                    if (event.data.success) {
                        resolve(event.data.deviceId);
                    } else {
                        reject(new Error(event.data.error || "Device registration failed"));
                    }

                    window.removeEventListener("message", handleMessage);
                }
            };

            window.addEventListener("message", handleMessage);

            this._iframe.contentWindow?.postMessage({
                action: "registerDevice",
                auth: auth,
                password: password,
            }, "*");
        });
    }

    async getCurrentDevice(): Promise<string|null> {
        await this.waitForIframeLoad();

        return new Promise((resolve, reject) => {
            // Function to handle message event
            const handleMessage = (event: MessageEvent) => {
                if (event.data.action === "currentDevice") {
                    if (event.data.success) {
                        if (event.data.deviceId) {
                            resolve(event.data.deviceId);
                        }

                        resolve(null);
                    } else {
                        reject(new Error(event.data.error || "Getting current device failed"));
                    }
                    window.removeEventListener("message", handleMessage);
                }
            };

            window.addEventListener("message", handleMessage);

            this._iframe.contentWindow?.postMessage({
                action: "getCurrentDevice",
            }, "*");
        });
    }

    async sign(message: string, auth: string): Promise<string> {
        await this.waitForIframeLoad();

        return new Promise((resolve, reject) => {
            // Function to handle message event
            const handleMessage = (event: MessageEvent) => {
                if (event.data.action === "messageSigned") {
                    if (event.data.success) {
                        resolve(event.data.signature);
                    } else {
                        reject(new Error(event.data.error || "Message sending failed"));
                    }

                    window.removeEventListener("message", handleMessage);
                }
            };

            window.addEventListener("message", handleMessage);

            this._iframe.contentWindow?.postMessage({
                action: "signMessage",
                message: message,
                auth: auth,
            }, "*");
        });
    }

    dispose() {
        document.body.removeChild(this._iframe);
    }
}