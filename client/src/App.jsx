import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Courses from "./pages/Courses.jsx";
import ExamManagement from "./pages/ExamManagement.jsx";
import Students from "./pages/Students.jsx";
import Applications from "./pages/Applications.jsx";
import Results from "./pages/Results.jsx";
import LiveMonitor from "./pages/LiveMonitor.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import StudentExams from "./pages/StudentExams.jsx";
import StudentExamDetails from "./pages/StudentExamDetails.jsx";
import ExamScreen from "./pages/ExamScreen.jsx";
import Profile from "./pages/Profile.jsx";
import ApplicationRegistration from "./pages/ApplicationRegistration.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/apply" element={<ApplicationRegistration />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute role="ADMIN" />}>
        <Route element={<Layout role="ADMIN" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/courses" element={<Courses />} />
          <Route path="/admin/exams" element={<ExamManagement />} />
          <Route path="/admin/students" element={<Students />} />
          <Route path="/admin/applications" element={<Applications />} />
          <Route path="/admin/results" element={<Results />} />
          <Route path="/admin/monitor" element={<LiveMonitor />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="STUDENT" />}>
        <Route element={<Layout role="STUDENT" />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/courses" element={<StudentExams />} />
          <Route path="/student/results" element={<Results />} />
          <Route path="/student/profile" element={<Profile />} />
        </Route>
        <Route path="/student/exams/:examId" element={<StudentExamDetails />} />
        <Route path="/student/exam/:attemptId" element={<ExamScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



