export class IframeClient {
    private readonly _iframe: HTMLIFrameElement;

    constructor(publishableKey: string, accessToken: string) {
        if (!document) {
            throw new Error("must be run in a browser");
        }

        const actualIframeURL = document.getElementById("openfort-iframe");
        if (actualIframeURL) {
            actualIframeURL.src = "https://iframe.openfort.xyz/iframe?accessToken=" + accessToken + "&publishableKey=" + publishableKey;
            this._iframe = actualIframeURL as HTMLIFrameElement;
            return;
        }

        this._iframe = document.createElement("iframe");
        const baseURL = "https://iframe.openfort.xyz";
        this._iframe.src = baseURL + "/iframe?accessToken=" + accessToken + "&publishableKey=" + publishableKey;
        this._iframe.style.display = "none";
        this._iframe.id = "openfort-iframe";
        document.body.appendChild(this._iframe);
    }

    public dispose(): void {
        const iframe = document.getElementById("openfort-iframe");
        if (iframe) {
            iframe.remove();
        }
    }

    public isLoaded(): boolean {
        return this._iframe.contentWindow !== null;
    }

    private async waitForIframeLoad(): Promise<void> {
        while (!this.isLoaded()) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    async createAccount(chainId: number, password?: string): Promise<string> {
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

            this._iframe.contentWindow?.postMessage(
                {
                    action: "generateKey",
                    password: password,
                    chainId: chainId,
                },
                "*",
            );
        });
    }

    async registerDevice(account: string, password?: string): Promise<string> {
        await this.waitForIframeLoad();

        return new Promise((resolve, reject) => {
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

            setTimeout(() => {
                if (this._iframe.contentWindow) {
                    this._iframe.contentWindow.postMessage(
                        {
                            action: "registerDevice",
                            account: account,
                            password: password,
                        },
                        "*",
                    );
                } else {
                    console.error("No iframe content window");
                }
            }, 1000);
        });
    }

    async getCurrentDevice(): Promise<string | null> {
        await this.waitForIframeLoad();

        return new Promise((resolve) => {
            const handleMessage = (event: MessageEvent) => {
                if (event.data.action === "currentDevice") {
                    if (event.data.success) {
                        resolve(event.data.deviceId);
                    } else {
                        resolve(null);
                    }
                    window.removeEventListener("message", handleMessage);
                }
            };

            window.addEventListener("message", handleMessage);

            setTimeout(() => {
                if (this._iframe.contentWindow) {
                    this._iframe.contentWindow.postMessage(
                        {
                            action: "getCurrentDevice",
                        },
                        "*",
                    );
                } else {
                    console.error("No iframe content window");
                }
            }, 1000);
        });
    }

    async sign(message: string): Promise<string> {
        await this.waitForIframeLoad();

        return new Promise((resolve, reject) => {
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

            setTimeout(() => {
                if (this._iframe.contentWindow) {
                    this._iframe.contentWindow.postMessage(
                        {
                            action: "signMessage",
                            message: message,
                        },
                        "*",
                    );
                } else {
                    console.error("No iframe content window");
                }
            }, 1000);
        });
    }

    async logout(): Promise<void> {
        await this.waitForIframeLoad();

        return new Promise((resolve, reject) => {
            const handleMessage = (event: MessageEvent) => {
                if (event.data.action === "loggedOut") {
                    if (event.data.success) {
                        resolve();
                    } else {
                        reject(new Error(event.data.error || "Dispose failed"));
                    }

                    window.removeEventListener("message", handleMessage);
                }
            };

            window.addEventListener("message", handleMessage);

            setTimeout(() => {
                if (this._iframe.contentWindow) {
                    this._iframe.contentWindow.postMessage(
                        {
                            action: "logout",
                        },
                        "*",
                    );
                } else {
                    console.error("No iframe content window");
                }
            }, 1000);
        });
    }

    async updateAuthentication(token: string): Promise<void> {
        await this.waitForIframeLoad();

        return new Promise((resolve, reject) => {
            const handleMessage = (event: MessageEvent) => {
                if (event.data.action === "authenticationUpdated") {
                    if (event.data.success) {
                        resolve();
                    } else {
                        reject(new Error(event.data.error || "Authentication update failed"));
                    }

                    window.removeEventListener("message", handleMessage);
                }
            };

            window.addEventListener("message", handleMessage);

            setTimeout(() => {
                if (this._iframe.contentWindow) {
                    this._iframe.contentWindow.postMessage(
                        {
                            action: "updateAuthentication",
                            token: token,
                        },
                        "*",
                    );
                } else {
                    console.error("No iframe content window");
                }
            }, 1000);
        });
    }
}
