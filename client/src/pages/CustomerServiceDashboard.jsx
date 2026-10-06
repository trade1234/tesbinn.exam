import { Headset, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function CustomerServiceDashboard() {
  const { user } = useAuth();
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold"><Headset className="text-blue-700" /> Customer Service</h2>
        <p className="mt-1 text-sm text-slate-500">Welcome{user?.name ? ", " + user.name : ""}. Create, view, and edit student accounts.</p>
      </div>
      <Link className="card flex items-center gap-4 p-5" to="/support/students">
        <Users size={24} className="text-blue-700" />
        <div><h3 className="font-bold">Students</h3><p className="text-sm text-slate-500">Create students, search accounts, and update their details.</p></div>
      </Link>
    </div>
  );
}
