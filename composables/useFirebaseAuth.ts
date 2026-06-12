import { getAdditionalUserInfo, getIdToken, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { UserInfoJWT } from '~~/types';
import useParser from '~/composables/useParser';

interface FirebaseResults {
    token: string | undefined;
    user: User;
    isNewUser: boolean | undefined;
}

export default function () {
    const { $auth, $router } = useNuxtApp();

    const user = useState<User | null>('google.com', () => null);

    const registerUser = async (): Promise<FirebaseResults | { error: ErrorConstructor }> => {
        try {
            const provider = new GoogleAuthProvider();
            const signIn = await signInWithPopup($auth, provider).then((result) => {
                const isNewUser = getAdditionalUserInfo(result)?.isNewUser;
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential?.accessToken;
                const user = result.user;
                return { token, user, isNewUser };
            });

            return signIn;
        } catch {
            // Error handled silently
            return { error: Error };
        }
    };

    const getParsedFirebaseJWTToken = async (): Promise<UserInfoJWT> => {
        const currentUser = $auth.currentUser;
        if (!currentUser) {
            throw new Error('No authenticated user');
        }

        const token = await getIdToken(currentUser);
        return useParser().parseJwt(token) as UserInfoJWT;
    };

    const getUserToken = async (): Promise<string> => {
        const currentUser = $auth.currentUser;
        if (!currentUser) {
            throw new Error('No authenticated user');
        }

        return await getIdToken(currentUser);
    };

    const logout = async (): Promise<boolean> => {
        await signOut($auth);
        await $router.push('/');
        return true;
    };

    return {
        user,
        registerUser,
        getParsedFirebaseJWTToken,
        getUserToken,
        logout,
    };
}
