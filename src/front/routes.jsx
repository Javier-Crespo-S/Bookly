import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home.jsx";
import { Library } from "./pages/Library.jsx";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import { Auth } from "./pages/Auth.jsx";
import { Explore } from "./pages/Explore.jsx";
import BookDetail from "./pages/BookDetail.jsx";
import { About } from "./pages/About.jsx";
import { AccountSettings } from "./pages/AccountSettings.jsx";
import { RequireAuth } from "./components/RequireAuth.jsx";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>}>
      <Route path="/auth" element={<Auth />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/about" element={<About />} />
      <Route path="/demo" element={<Demo />} />

      <Route
        index
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />

      <Route
        path="/home"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />

      <Route
        path="/library"
        element={
          <RequireAuth>
            <Library />
          </RequireAuth>
        }
      />

      <Route
        path="/single/:theId"
        element={
          <RequireAuth>
            <Single />
          </RequireAuth>
        }
      />

      <Route path="/books/:id" element={<BookDetail />} />

      <Route path="/books/google/:googleId" element={<BookDetail />} />

      <Route
        path="/account"
        element={
          <RequireAuth>
            <AccountSettings />
          </RequireAuth>
        }
      />
    </Route>
  )
);