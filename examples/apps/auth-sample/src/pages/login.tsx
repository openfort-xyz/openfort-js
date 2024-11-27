import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Layout } from "../components/Layouts/Layout";
import { TextField } from "../components/Fields";
import { StatusType, Toast } from "../components/Toasts";
import openfort from "../utils/openfortConfig";
import { getURL } from "../utils/getUrl";
import { AuthPlayerResponse, OAuthProvider } from "@openfort/openfort-js";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";

function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusType>(null);
  const [user, setUser] = useState<AuthPlayerResponse | null>(null);

  useEffect(() => {
    if (
      router.query.access_token &&
      router.query.refresh_token &&
      router.query.player_id
    ) {
      setStatus({
        type: "loading",
        title: "Signing in...",
      });
      openfort.storeCredentials({
        player: router.query.player_id as string,
        accessToken: router.query.access_token as string,
        refreshToken: router.query.refresh_token as string,
      });
      location.href = "/";
    }
  }, [router.query]);

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.getUser().catch((error: Error) => {
        console.log("error", error);
      });
      if (sessionData) setUser(sessionData);
    };
    fetchUser();
  }, [openfort]);

  const [show, setShow] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setStatus({
        type: "loading",
        title: "Signing in...",
      });

      router.push("/");
    };

    if (user) loadData();
  }, [user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setStatus({
      type: "loading",
      title: "Signing in...",
    });
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    event.preventDefault();

    const data = await openfort
      .logInWithEmailPassword({
        email: email,
        password: password,
      })
      .catch((error) => {
        setStatus({
          type: "error",
          title: "Error signing in",
        });
      });
    if (data) {
      setStatus({
        type: "success",
        title: "Successfully signed in",
      });
      router.push("/");
    }
  };

  return (
    <Layout sidebar={
      <div className='flex-col space-y-4 p-8'>
        <div className='bg-white text-sm p-3 border-orange-400 border-4 rounded-sm'>
          <p className="font-medium pb-1">
            Explore Openfort
          </p>
          <p className='text-gray-500'>
          Sign in to the demo to access the dev tools.
          </p>
          <Button variant={'outline'} size={'sm'} className="mt-2">
            <Link href='https://openfort.xyz/docs' target="_blank">
              Explore the Docs
            </Link>
          </Button>
        </div>
      </div>
    }>
      <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
          <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
            <div className="relative mb-6">
              <h1 className="text-left text-2xl font-semibold tracking-tight text-gray-900">
                {"Sign in to account"}
              </h1>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <TextField
                  label="Email address"
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
                <TextField
                  label="Password"
                  id="password"
                  name="password"
                  show={show}
                  setShow={setShow}
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <div className="flex w-full flex-row-reverse ">
                  <Button
                    variant="link"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push("/forgot-password");
                    }}
                    className="text-blue-600"
                  >
                    Forgot password?
                  </Button>
                </div>
              </div>
              <Button
                disabled={status?.type === "loading"}
                type="submit"
                className="w-full"
              >
                {status?.type === "loading" ? (
                  <Loading />
                ) : (
                  "Sign in to account"
                )}
              </Button>
            </form>
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-2 grid-cols-1 gap-3">
                <div>
                  <Button
                    onClick={async () => {
                      const { url } = await openfort.initOAuth({
                        provider: OAuthProvider.GOOGLE,
                        options: {
                          redirectTo: getURL() + "/login",
                        },
                      });
                      window.location.href = url;
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <span>Continue with Google</span>
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={async () => {
                      const { url } = await openfort.initOAuth({
                        provider: OAuthProvider.TWITTER,
                        options: {
                          redirectTo: getURL() + "/login",
                        },
                      });
                      window.location.href = url;
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <p>Continue with Twitter</p>
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={async () => {
                      const { url } = await openfort.initOAuth({
                        provider: OAuthProvider.FACEBOOK,
                        options: {
                          redirectTo: getURL() + "/login",
                        },
                      });
                      window.location.href = url;
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <p>Continue with Facebook</p>
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={() => router.push("/connect-wallet")}
                    variant="outline"
                    className="w-full"
                  >
                    <p>Continue with wallet</p>
                  </Button>
                </div>
              </div>
            </div>
            <p className="my-5 text-left text-sm text-gray-600">
              {"Don’t have an account? "}
              <Link href="/register" className="text-blue-600">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Toast status={status} setStatus={setStatus} />
    </Layout>
  );
}

export default LoginPage;
