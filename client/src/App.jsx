import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import { PageSkeleton } from "./components/Skeleton.jsx";
const Home = lazy(() => import("./pages/Home.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const Courses = lazy(() => import("./pages/Courses.jsx"));
const ExamManagement = lazy(() => import("./pages/ExamManagement.jsx"));
const Students = lazy(() => import("./pages/Students.jsx"));
const Applications = lazy(() => import("./pages/Applications.jsx"));
const Results = lazy(() => import("./pages/Results.jsx"));
const LiveMonitor = lazy(() => import("./pages/LiveMonitor.jsx"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard.jsx"));
const StudentExams = lazy(() => import("./pages/StudentExams.jsx"));
const StudentExamDetails = lazy(() => import("./pages/StudentExamDetails.jsx"));
const ExamScreen = lazy(() => import("./pages/ExamScreen.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const ApplicationRegistration = lazy(() => import("./pages/ApplicationRegistration.jsx"));
const RetakeUsers = lazy(() => import("./pages/RetakeUsers.jsx"));
const DisqualifiedStudents = lazy(() => import("./pages/DisqualifiedStudents.jsx"));
const Certificates = lazy(() => import("./pages/Certificates.jsx"));
const StudentResult = lazy(() => import("./pages/StudentResult.jsx"));
const DataExports = lazy(() => import("./pages/DataExports.jsx"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate.jsx"));
const DataAnalytics = lazy(() => import("./pages/DataAnalytics.jsx"));
const CertificateAccess = lazy(() => import("./pages/CertificateAccess.jsx"));
const AccountManagement = lazy(() => import("./pages/AccountManagement.jsx"));
const CustomerServiceDashboard = lazy(() => import("./pages/CustomerServiceDashboard.jsx"));
const ActivityLogs = lazy(() => import("./pages/ActivityLogs.jsx"));

export default function App() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-8"><PageSkeleton /></div>}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/apply" element={<ApplicationRegistration />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
      <Route element={<ProtectedRoute role="ADMIN" />}>
        <Route element={<Layout role="ADMIN" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/courses" element={<Courses />} />
          <Route path="/admin/exams" element={<ExamManagement />} />
          <Route path="/admin/students" element={<Students />} />
          <Route path="/admin/applications" element={<Applications />} />
          <Route path="/admin/data" element={<DataExports />} />
          <Route path="/admin/analytics" element={<DataAnalytics />} />
          <Route path="/admin/results" element={<Results />} />
          <Route path="/admin/certificates" element={<Certificates />} />
          <Route path="/admin/certificates/:id" element={<Certificates />} />
          <Route path="/admin/certificate-access" element={<CertificateAccess />} />
          <Route path="/admin/accounts" element={<AccountManagement />} />
          <Route path="/admin/activity-logs" element={<ActivityLogs />} />
          <Route path="/admin/retakes" element={<RetakeUsers />} />
          <Route path="/admin/disqualified" element={<DisqualifiedStudents />} />
          <Route path="/admin/monitor" element={<LiveMonitor />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="CUSTOMER_SERVICE" />}>
        <Route element={<Layout role="CUSTOMER_SERVICE" />}>
          <Route path="/support" element={<CustomerServiceDashboard />} />
          <Route path="/support/students" element={<Students />} />
          <Route path="/support/courses" element={<Courses />} />
          <Route path="/support/exams" element={<ExamManagement />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="STUDENT" />}>
        <Route element={<Layout role="STUDENT" />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/courses" element={<StudentExams />} />
          <Route path="/student/results" element={<Results />} />
          <Route path="/student/results/:attemptId" element={<StudentResult />} />
          <Route path="/student/certificates" element={<Certificates />} />
          <Route path="/student/certificates/:id" element={<Certificates />} />
          <Route path="/student/profile" element={<Profile />} />
        </Route>
        <Route path="/student/exams/:examId" element={<StudentExamDetails />} />
        <Route path="/student/exam/:attemptId" element={<ExamScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
