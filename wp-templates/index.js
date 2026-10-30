import page from "./page";
import single from "./single";
import archive from "./archive";
import author from "./author";

// The homepage ("/") is not a template: pages/index.js renders
// components/FrontPage.js with its own single WordPress request.
export default {
  page,
  single,
  author,
  archive,
};
