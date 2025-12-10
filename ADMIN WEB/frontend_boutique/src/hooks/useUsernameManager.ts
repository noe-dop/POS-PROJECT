// // src/hooks/useUsernameManager.ts
// import { useState, useCallback, useRef } from 'react';
// import { authService } from '@services/auth';

// export const useUsernameManager = () => {
//   const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
//   const [isCheckingUsername, setIsCheckingUsername] = useState(false);
//   const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
//   const [usernameError, setUsernameError] = useState<string>('');
  
//   const debounceRef = useRef<NodeJS.Timeout | null>(null);

//   const checkUsernameAvailability = useCallback(async (username: string) => {
//     if (debounceRef.current) {
//       clearTimeout(debounceRef.current);
//     }

//     setUsernameAvailable(null);
//     setUsernameError('');
//     setUsernameSuggestions([]);

//     if (!username) return;

//     if (username.length < 3) {
//       setUsernameError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
//       return;
//     }

//     if (!/^[a-zA-Z0-9_]+$/.test(username)) {
//       setUsernameError('Seuls les lettres, chiffres et underscores (_) sont autorisés');
//       return;
//     }

//     debounceRef.current = setTimeout(async () => {
//       setIsCheckingUsername(true);
      
//       try {
//         const isAvailable = await authService.checkUsernameAvailability(username);
//         setUsernameAvailable(isAvailable);
        
//         if (!isAvailable) {
//           // Générer les suggestions directement ici
//           const suggestions = [
//             `${username}${Math.floor(Math.random() * 100)}`,
//             `${username}${Math.floor(Math.random() * 1000)}`,
//             `${username}_${Math.floor(Math.random() * 100)}`,
//             `user_${username}`,
//           ].filter((suggestion, index, self) => self.indexOf(suggestion) === index);
          
//           setUsernameSuggestions(suggestions.slice(0, 4));
//           setUsernameError('Ce nom d\'utilisateur est déjà pris');
//         } else {
//           setUsernameError('');
//         }
//       } catch (error) {
//         console.error('Erreur vérification username:', error);
//         setUsernameAvailable(null);
//         setUsernameError('Erreur de vérification');
//       } finally {
//         setIsCheckingUsername(false);
//       }
//     }, 500);
//   }, []);

//   const useSuggestion = useCallback((suggestion: string) => {
//     setUsernameSuggestions([]);
//     setUsernameAvailable(true);
//     setUsernameError('');
//     return suggestion;
//   }, []);

//   const resetUsernameManager = useCallback(() => {
//     setUsernameSuggestions([]);
//     setUsernameAvailable(null);
//     setUsernameError('');
//     setIsCheckingUsername(false);
    
//     if (debounceRef.current) {
//       clearTimeout(debounceRef.current);
//       debounceRef.current = null;
//     }
//   }, []);

//   const validateUsername = useCallback((username: string): { isValid: boolean; error?: string } => {
//     if (!username || username.trim().length === 0) {
//       return { isValid: false, error: 'Le nom d\'utilisateur est requis' };
//     }

//     if (username.length < 3) {
//       return { isValid: false, error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' };
//     }

//     if (!/^[a-zA-Z0-9_]+$/.test(username)) {
//       return { isValid: false, error: 'Seuls les lettres, chiffres et underscores (_) sont autorisés' };
//     }

//     if (usernameAvailable === false) {
//       return { isValid: false, error: 'Ce nom d\'utilisateur est déjà pris' };
//     }

//     return { isValid: true };
//   }, [usernameAvailable]);

//   return {
//     usernameSuggestions,
//     isCheckingUsername,
//     usernameAvailable,
//     usernameError,
//     checkUsernameAvailability,
//     useSuggestion,
//     resetUsernameManager,
//     validateUsername,
//   };
// };