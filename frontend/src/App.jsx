import { useState } from "react";
import Header from "./components/Header";
import MenuBar from "./components/MenuBar";
import Operations from "./pages/Operations";
import Marketing from "./pages/Marketing";
import Accounting from "./pages/Accounting";
import Legal from "./pages/Legal";
import "./styles/app.css";

function App() {
  const [section, setSection] = useState("operations");

  const renderSection = () => {
    switch (section) {
      case "operations": return <Operations />;
      case "marketing": return <Marketing />;
      case "accounting": return <Accounting />;
      case "legal": return <Legal />;
      default: return <Operations />;
    }
  };

  return (
    <div className="app">
      <Header title="Business Assistant" />
      <div className="content">{renderSection()}</div>
      <MenuBar setSection={setSection} section={section} />
    </div>
  );
}

export default App;
