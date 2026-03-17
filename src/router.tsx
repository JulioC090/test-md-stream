import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import { HomePage } from "./pages/HomePage";
import { StandardStreamPage } from "./pages/StandardStreamPage";
import { BlockStreamPage } from "./pages/BlockStreamPage";
import { VirtualizedStreamPage } from "./pages/VirtualizedStreamPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "standard", element: <StandardStreamPage /> },
        { path: "block", element: <BlockStreamPage /> },
        { path: "virtualized", element: <VirtualizedStreamPage /> },
      ],
    },
  ],
  { basename: "/test-md-stream" }
);
