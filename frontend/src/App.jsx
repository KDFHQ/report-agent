import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router";
import ReportChat from "@/pages/ReportChat";
import Login from "@/pages/Login";
import user from '@/worker/user'

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user.is_login) {
      navigate("/login");
    }
  }, [user.is_login]);
  return (
    <Routes>
      <Route path="/" element={<ReportChat />} />
      <Route path="/login" element={<Login />} />
      <Route path="/report/:type" element={<ReportChat />} />
    </Routes>
  );
}

export default App;
