// Store real refresh-token sessions; a cached user ID is not authentication.
export const sessionStorageAdapter = {
  getItem(key: string) {
    return (localStorage.getItem('remember_me') === 'false' ? sessionStorage : localStorage).getItem(key);
  },
  setItem(key: string, value: string) {
    const persistent = localStorage.getItem('remember_me') !== 'false';
    (persistent ? localStorage : sessionStorage).setItem(key, value);
    (persistent ? sessionStorage : localStorage).removeItem(key);
  },
  removeItem(key: string) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};
