import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import CreateInventory from "@/pages/CreateInventory";
import EditInventory from "@/pages/EditInventory";
import ReportPreview from "@/pages/ReportPreview";
import SignaturePage from "@/pages/SignaturePage";
import VerificationPage from "@/pages/VerificationPage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateInventory />} />
          <Route path="/edit/:id" element={<EditInventory />} />
          <Route path="/preview/:id" element={<ReportPreview />} />
          <Route path="/sign/:token" element={<SignaturePage />} />
          <Route path="/verify/:token" element={<VerificationPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;