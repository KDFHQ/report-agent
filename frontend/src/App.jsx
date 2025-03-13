import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router";
import ReportChat from "@/pages/ReportChat";
import Login from "@/pages/Login";
import user from '@/worker/user'
import { observer } from "mobx-react-lite";

function App() {
  const location = useLocation()
  const navigate = useNavigate();

  useEffect(() => {
    if (!user.is_login) {
      navigate("/login");
    }
  }, [user.is_login]);

  useEffect(() => {
    if (location.pathname == '/') {
      navigate("/report/cn")
    }
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/report/:type" element={<ReportChat />} />
    </Routes>
  );
}

export default observer(App);
