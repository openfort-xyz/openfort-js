import {AxiosError} from "axios";

function parseAndPrepareHttpError<T>(error: T): Error | T {
    if (error instanceof AxiosError && error.response?.data?.error?.message) {
        throw new Error(error.response?.data?.error?.message);
    }
    throw error;
}

export function httpErrorHandler() {
    return <T, Args extends T[], R>(
        target: object,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<(...args: Args) => Promise<R>>,
    ) => {
        const targetMethod = descriptor.value;
        if (targetMethod) {
            descriptor.value = function (...args: Args) {
                try {
                    const result = targetMethod.apply(this, args);
                    if (result instanceof Promise) {
                        return result.catch((error) => {
                            throw parseAndPrepareHttpError(error);
                        });
                    }
                    return result;
                } catch (error) {
                    throw parseAndPrepareHttpError(error);
                }
            };
        }
    };
}
