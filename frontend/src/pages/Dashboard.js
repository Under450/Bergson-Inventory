import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Search, FileText, CheckCircle, Clock, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BergasonLogo from "@/assets/bergason-logo.jpg";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [inventories, setInventories] = useState([]);
  const [filteredInventories, setFilteredInventories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventories();
  }, []);

  useEffect(() => {
    filterInventories();
  }, [searchTerm, inventories]);

  const fetchInventories = async () => {
    try {
      const response = await axios.get(`${API}/inventories`);
      setInventories(response.data);
      setFilteredInventories(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching inventories:", error);
      toast.error("Failed to load inventories");
      setLoading(false);
    }
  };

  const filterInventories = () => {
    if (!searchTerm) {
      setFilteredInventories(inventories);
      return;
    }
    const filtered = inventories.filter((inv) =>
      inv.property_overview.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.property_overview.tenant_names.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredInventories(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "draft": return <Clock className="w-5 h-5 text-yellow-600" />;
      case "sent": return <FileText className="w-5 h-5 text-blue-600" />;
      case "signed": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "archived": return <Archive className="w-5 h-5 text-gray-600" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: "bg-yellow-100 text-yellow-800",
      sent: "bg-blue-100 text-blue-800",
      signed: "bg-green-100 text-green-800",
      archived: "bg-gray-100 text-gray-800"
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const stats = {
    total: inventories.length,
    pending: inventories.filter(i => i.status === "sent").length,
    signed: inventories.filter(i => i.status === "signed").length,
    draft: inventories.filter(i => i.status === "draft").length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      {/* Header */}
      <header className="bg-black border-b-4 border-[#F5E6D3] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={BergasonLogo} alt="Bergason" className="h-16 w-16 object-contain" />
              <div>
                <h1 className="text-3xl font-bold text-[#F5E6D3] logo-font">Bergason Property Services</h1>
                <p className="text-[#F5E6D3]/80 text-sm">Inventory Management System</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate("/create")} 
              className="bg-[#F5E6D3] text-black hover:bg-[#D4AF37] font-semibold px-6 py-3 text-lg"
              data-testid="create-inventory-btn"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Inventory
            </Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border-2 border-black p-6 shadow-lg">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Inventories</div>
            <div className="text-4xl font-bold text-black">{stats.total}</div>
          </div>
          <div className="bg-white border-2 border-yellow-600 p-6 shadow-lg">
            <div className="text-sm font-medium text-gray-600 mb-1">Drafts</div>
            <div className="text-4xl font-bold text-yellow-600">{stats.draft}</div>
          </div>
          <div className="bg-white border-2 border-blue-600 p-6 shadow-lg">
            <div className="text-sm font-medium text-gray-600 mb-1">Pending Signature</div>
            <div className="text-4xl font-bold text-blue-600">{stats.pending}</div>
          </div>
          <div className="bg-white border-2 border-green-600 p-6 shadow-lg">
            <div className="text-sm font-medium text-gray-600 mb-1">Signed</div>
            <div className="text-4xl font-bold text-green-600">{stats.signed}</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border-2 border-black p-6 shadow-lg mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by address or tenant name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 py-6 text-lg border-2 border-gray-300 focus:border-black"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Inventories List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading inventories...</div>
          ) : filteredInventories.length === 0 ? (
            <div className="text-center py-12 bg-white border-2 border-gray-300 shadow-lg">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No inventories found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first property inventory</p>
              <Button 
                onClick={() => navigate("/create")} 
                className="bg-black text-[#F5E6D3] hover:bg-gray-800"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Inventory
              </Button>
            </div>
          ) : (
            filteredInventories.map((inventory) => (
              <div 
                key={inventory.id} 
                className="bg-white border-2 border-gray-300 hover:border-black p-6 shadow-lg cursor-pointer transition-all"
                onClick={() => navigate(`/preview/${inventory.id}`)}
                data-testid={`inventory-card-${inventory.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(inventory.status)}
                      <h3 className="text-xl font-bold text-black">{inventory.property_overview.address}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold uppercase ${getStatusBadge(inventory.status)}`}>
                        {inventory.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-semibold">Tenant:</span> {inventory.property_overview.tenant_names.join(", ")}</p>
                      <p><span className="font-semibold">Landlord:</span> {inventory.property_overview.landlord_name}</p>
                      <p><span className="font-semibold">Inspection Date:</span> {inventory.property_overview.inspection_date}</p>
                      <p><span className="font-semibold">Created:</span> {new Date(inventory.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {inventory.property_overview.property_photos.length > 0 && (
                    <img 
                      src={`${BACKEND_URL}${inventory.property_overview.property_photos[0]}`} 
                      alt="Property" 
                      className="w-32 h-32 object-cover border-2 border-gray-300 ml-6"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;