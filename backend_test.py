import requests
import sys
import json
from datetime import datetime
import os
import tempfile

class InventoryAPITester:
    def __init__(self, base_url="https://inventory-manager-156.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_inventory_id = None
        self.shareable_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_predefined_rooms(self):
        """Test predefined rooms endpoint"""
        success, response = self.run_test("Predefined Rooms", "GET", "rooms/predefined", 200)
        if success and 'rooms' in response:
            print(f"   Found {len(response['rooms'])} predefined rooms")
            return True
        return False

    def test_create_inventory(self):
        """Test inventory creation"""
        inventory_data = {
            "property_overview": {
                "address": "123 Test Street, Test City",
                "property_type": "Residential",
                "landlord_name": "Test Landlord",
                "tenant_names": ["Test Tenant"],
                "inspection_date": "2024-01-15",
                "general_description": "Test property description",
                "property_photos": []
            },
            "health_safety": {
                "meters": [],
                "safety_items": [],
                "compliance_documents": []
            },
            "rooms": []
        }
        
        success, response = self.run_test("Create Inventory", "POST", "inventories", 200, inventory_data)
        if success and 'id' in response:
            self.test_inventory_id = response['id']
            print(f"   Created inventory with ID: {self.test_inventory_id}")
            return True
        return False

    def test_get_inventories(self):
        """Test getting all inventories"""
        success, response = self.run_test("Get All Inventories", "GET", "inventories", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} inventories")
            return True
        return False

    def test_get_inventory_by_id(self):
        """Test getting specific inventory"""
        if not self.test_inventory_id:
            print("❌ No inventory ID available for testing")
            return False
        
        success, response = self.run_test("Get Inventory by ID", "GET", f"inventories/{self.test_inventory_id}", 200)
        if success and 'id' in response:
            print(f"   Retrieved inventory: {response['property_overview']['address']}")
            return True
        return False

    def test_update_inventory(self):
        """Test updating inventory"""
        if not self.test_inventory_id:
            print("❌ No inventory ID available for testing")
            return False
        
        update_data = {
            "property_overview": {
                "address": "123 Updated Test Street, Test City",
                "property_type": "Residential",
                "landlord_name": "Updated Test Landlord",
                "tenant_names": ["Updated Test Tenant"],
                "inspection_date": "2024-01-16",
                "general_description": "Updated test property description",
                "property_photos": []
            }
        }
        
        success, response = self.run_test("Update Inventory", "PUT", f"inventories/{self.test_inventory_id}", 200, update_data)
        if success and 'id' in response:
            print(f"   Updated inventory address: {response['property_overview']['address']}")
            return True
        return False

    def test_file_uploads(self):
        """Test file upload endpoints"""
        # Create a test image file
        test_content = b"fake image content for testing"
        
        # Test property photo upload
        files = {'file': ('test_property.jpg', test_content, 'image/jpeg')}
        success, response = self.run_test("Upload Property Photo", "POST", "upload/property-photo", 200, files=files)
        
        if not success:
            return False
        
        # Test regular photo upload
        data = {'room_reference': 'Living Room', 'description': 'Test photo'}
        files = {'file': ('test_photo.jpg', test_content, 'image/jpeg')}
        success, response = self.run_test("Upload Photo", "POST", "upload/photo", 200, data, files)
        
        if not success:
            return False
        
        # Test document upload
        files = {'file': ('test_doc.pdf', b"fake pdf content", 'application/pdf')}
        success, response = self.run_test("Upload Document", "POST", "upload/document", 200, files=files)
        
        return success

    def test_generate_shareable_link(self):
        """Test generating shareable link"""
        if not self.test_inventory_id:
            print("❌ No inventory ID available for testing")
            return False
        
        success, response = self.run_test("Generate Shareable Link", "POST", f"inventories/{self.test_inventory_id}/generate-link", 200)
        if success and 'token' in response:
            self.shareable_token = response['token']
            print(f"   Generated token: {self.shareable_token}")
            return True
        return False

    def test_get_inventory_by_token(self):
        """Test getting inventory by shareable token"""
        if not self.shareable_token:
            print("❌ No shareable token available for testing")
            return False
        
        success, response = self.run_test("Get Inventory by Token", "GET", f"sign/{self.shareable_token}", 200)
        if success and 'id' in response:
            print(f"   Retrieved inventory via token: {response['property_overview']['address']}")
            return True
        return False

    def test_signature_workflow(self):
        """Test complete signature workflow with specific token"""
        # Use the specific token from the review request
        test_token = "f9462b2d-0f81-4455-830a-3fb474b687f3"
        
        print(f"\n🔍 Testing Complete Signature Workflow with token: {test_token}")
        
        # First, verify we can get the inventory by token
        success, inventory = self.run_test("Get Inventory by Test Token", "GET", f"sign/{test_token}", 200)
        if not success:
            print("❌ Cannot retrieve inventory with test token")
            return False
        
        print(f"   Retrieved inventory: {inventory.get('property_overview', {}).get('address', 'Unknown')}")
        
        # Test 1: Submit first signature (Tenant)
        signature_data_1 = {
            "signer_name": "Test Tenant",
            "signer_role": "Tenant",
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "email": "test@example.com",
            "tenant_present": True,
            "ip_address": "127.0.0.1"
        }
        
        success, response = self.run_test("Submit First Signature (Tenant)", "POST", f"sign/{test_token}/submit", 200, signature_data_1)
        if not success:
            return False
        print(f"   First signature submitted successfully")
        
        # Test 2: Submit second signature (Inspector)
        signature_data_2 = {
            "signer_name": "Test Inspector",
            "signer_role": "Inspector", 
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "email": "inspector@example.com",
            "tenant_present": True,
            "ip_address": "127.0.0.1"
        }
        
        success, response = self.run_test("Submit Second Signature (Inspector)", "POST", f"sign/{test_token}/submit", 200, signature_data_2)
        if not success:
            return False
        print(f"   Second signature submitted successfully")
        
        # Test 3: Verify multiple signatures were added
        success, inventory_with_sigs = self.run_test("Get Inventory with Signatures", "GET", f"sign/{test_token}", 200)
        if success and inventory_with_sigs.get('signature'):
            signatures = inventory_with_sigs['signature'].get('signatures', [])
            print(f"   Found {len(signatures)} signatures in document")
            if len(signatures) >= 2:
                print("✅ Multiple signatures successfully added")
            else:
                print("❌ Expected at least 2 signatures")
                return False
        else:
            print("❌ No signature data found")
            return False
        
        # Test 4: Lock the document
        success, response = self.run_test("Lock Document", "POST", f"sign/{test_token}/lock", 200)
        if not success:
            return False
        print(f"   Document locked successfully")
        
        # Test 5: Verify document is locked
        success, locked_inventory = self.run_test("Verify Document Locked", "GET", f"sign/{test_token}", 200)
        if success and locked_inventory.get('signature', {}).get('is_locked'):
            print("✅ Document is properly locked")
        else:
            print("❌ Document is not locked")
            return False
        
        # Test 6: Try to add signature to locked document (should fail)
        signature_data_3 = {
            "signer_name": "Another Tenant",
            "signer_role": "Tenant",
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "email": "another@example.com",
            "tenant_present": True,
            "ip_address": "127.0.0.1"
        }
        
        success, response = self.run_test("Try Adding Signature to Locked Document (Should Fail)", "POST", f"sign/{test_token}/submit", 403, signature_data_3)
        if success:
            print("✅ Locked document correctly rejected new signature")
        else:
            print("❌ Locked document should have rejected new signature with 403 status")
            return False
        
        # Test 7: Verify signature via verification endpoint
        success, verification = self.run_test("Verify Signatures", "GET", f"verify/{test_token}", 200)
        if success and verification.get('status') == 'verified':
            print("✅ Signature verification successful")
            print(f"   Property: {verification.get('property_address', 'Unknown')}")
            print(f"   Authentic: {verification.get('is_authentic', False)}")
        else:
            print("❌ Signature verification failed")
            return False
        
        return True

    def test_verify_signature(self):
        """Test signature verification"""
        if not self.shareable_token:
            print("❌ No shareable token available for testing")
            return False
        
        success, response = self.run_test("Verify Signature", "GET", f"verify/{self.shareable_token}", 200)
        if success and 'status' in response:
            print(f"   Verification status: {response['status']}")
            return True
        return False

    def test_delete_inventory(self):
        """Test inventory deletion"""
        if not self.test_inventory_id:
            print("❌ No inventory ID available for testing")
            return False
        
        success, response = self.run_test("Delete Inventory", "DELETE", f"inventories/{self.test_inventory_id}", 200)
        if success:
            print(f"   Deleted inventory: {self.test_inventory_id}")
            return True
        return False

def main():
    print("🚀 Starting Bergason Property Services Inventory API Tests")
    print("=" * 60)
    
    tester = InventoryAPITester()
    
    # Run all tests in sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_predefined_rooms,
        tester.test_create_inventory,
        tester.test_get_inventories,
        tester.test_get_inventory_by_id,
        tester.test_update_inventory,
        tester.test_file_uploads,
        tester.test_generate_shareable_link,
        tester.test_get_inventory_by_token,
        tester.test_signature_workflow,  # New comprehensive signature workflow test
        # Note: Not deleting inventory to keep it for frontend testing
        # tester.test_delete_inventory,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.test_inventory_id:
        print(f"🔗 Test inventory ID: {tester.test_inventory_id}")
    if tester.shareable_token:
        print(f"🔗 Test shareable token: {tester.shareable_token}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())