export const initialStore = () => {
  const token = localStorage.getItem("token") || null;
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  const guest = localStorage.getItem("guest") === "1";

  return {
    user,
    token,
    guest: token ? false : guest,
    books: [],
  };
};

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "login": {
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
      localStorage.removeItem("guest");

      return {
        ...store,
        token: action.payload.token,
        user: action.payload.user,
        guest: false,
      };
    }

    case "logout": {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("guest");

      return {
        ...store,
        token: null,
        user: null,
        guest: false,
        books: [],
      };
    }

    case "set_guest": {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.setItem("guest", "1");

      return {
        ...store,
        token: null,
        user: null,
        guest: true,
        books: [],
      };
    }

    case "set_books":
      return {
        ...store,
        books: action.payload,
      };

    default:
      throw Error("Unknown action.");
  }
}