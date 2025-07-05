import requests
import sys
import json
import time
import random
import string
from datetime import datetime

class StreamflixAPITester:
    def __init__(self, base_url="https://2aace001-fb12-49cf-a253-7ea999d8d7a3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = {
            "email": "alexx5916000@gmail.com",
            "password": "@lexiS-59_160"
        }
        self.test_user = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "Test@123456"
        }
        self.test_content = {
            "title": f"Test Film {datetime.now().strftime('%H%M%S')}",
            "description": "Film de test pour vérifier l'API",
            "category": "action",
            "video_url": "https://player.vimeo.com/video/123456789",
            "video_source": "vimeo",
            "cover_image": "https://picsum.photos/200/300",
            "type": "movie",
            "duration": 120,
            "year": 2024
        }
        self.content_id = None
        self.favorite_content_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, auth=True, use_user_token=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth:
            if use_user_token and self.user_token:
                headers['Authorization'] = f'Bearer {self.user_token}'
            elif self.token:
                headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)[:500]}...")
            except:
                response_data = {}
                print(f"Response status: {response.status_code}")
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if hasattr(response, 'text'):
                    print(f"Response text: {response.text[:500]}")

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "health",
            200,
            auth=False
        )
        
    def test_get_settings(self):
        """Test getting global settings"""
        return self.run_test(
            "Get Settings",
            "GET",
            "settings",
            200,
            auth=False
        )

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=self.admin_user,
            auth=False
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"Admin user role: {response['user']['role']}")
            return True
        return False
        
    def test_user_registration(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=self.test_user,
            auth=False
        )
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            print(f"Registered user: {self.test_user['email']}")
            return True
        return False
        
    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=self.test_user,
            auth=False
        )
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            print(f"User login successful: {self.test_user['email']}")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        return self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
    def test_get_user_info(self):
        """Test getting user info with user token"""
        return self.run_test(
            "Get User Info",
            "GET",
            "auth/me",
            200,
            auth=True,
            use_user_token=True
        )

    def test_get_admin_contents(self):
        """Test getting all contents as admin"""
        success, response = self.run_test(
            "Get All Contents (Admin)",
            "GET",
            "admin/contents",
            200
        )
        return success
        
    def test_get_public_contents(self):
        """Test getting public contents"""
        success, response = self.run_test(
            "Get Public Contents",
            "GET",
            "contents",
            200,
            auth=False
        )
        if success and len(response) > 0:
            # Save a content ID for favorite testing
            self.favorite_content_id = response[0]['id']
            print(f"Found content for favorite testing: {self.favorite_content_id}")
        return success
        
    def test_get_content_by_id(self):
        """Test getting a specific content by ID"""
        if not self.favorite_content_id:
            print("❌ No content ID available for get content test")
            return False
            
        return self.run_test(
            "Get Content by ID",
            "GET",
            f"contents/{self.favorite_content_id}",
            200,
            auth=False
        )
        
    def test_get_categories(self):
        """Test getting all categories"""
        return self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200,
            auth=False
        )
        
    def test_search_contents(self):
        """Test searching contents"""
        return self.run_test(
            "Search Contents",
            "GET",
            "contents?search=grand",
            200,
            auth=False
        )
        
    def test_filter_by_category(self):
        """Test filtering contents by category"""
        return self.run_test(
            "Filter by Category",
            "GET",
            "contents?category=comédie",
            200,
            auth=False
        )

    def test_create_content(self):
        """Test creating a new content"""
        success, response = self.run_test(
            "Create Content",
            "POST",
            "admin/contents",
            200,
            data=self.test_content
        )
        if success and 'id' in response:
            self.content_id = response['id']
            print(f"Created content with ID: {self.content_id}")
            return True
        return False

    def test_update_content(self):
        """Test updating a content"""
        if not self.content_id:
            print("❌ No content ID available for update test")
            return False
            
        update_data = {
            "title": f"Updated Film {datetime.now().strftime('%H%M%S')}",
            "description": "Description mise à jour pour le test"
        }
        
        success, response = self.run_test(
            "Update Content",
            "PUT",
            f"admin/contents/{self.content_id}",
            200,
            data=update_data
        )
        return success
        
    def test_update_settings(self):
        """Test updating global settings"""
        settings_data = {
            "registration_enabled": True
        }
        
        success, response = self.run_test(
            "Update Settings",
            "PUT",
            "admin/settings",
            200,
            data=settings_data
        )
        return success
        
    def test_get_admin_stats(self):
        """Test getting admin statistics"""
        return self.run_test(
            "Get Admin Stats",
            "GET",
            "admin/stats",
            200
        )
        
    def test_add_to_favorites(self):
        """Test adding content to favorites"""
        if not self.favorite_content_id:
            print("❌ No content ID available for favorites test")
            return False
            
        success, response = self.run_test(
            "Add to Favorites",
            "POST",
            f"favorites/{self.favorite_content_id}",
            200,
            auth=True,
            use_user_token=True
        )
        return success
        
    def test_get_favorites(self):
        """Test getting user favorites"""
        success, response = self.run_test(
            "Get Favorites",
            "GET",
            "favorites",
            200,
            auth=True,
            use_user_token=True
        )
        return success
        
    def test_check_favorite(self):
        """Test checking if content is in favorites"""
        if not self.favorite_content_id:
            print("❌ No content ID available for check favorite test")
            return False
            
        success, response = self.run_test(
            "Check Favorite",
            "GET",
            f"favorites/check/{self.favorite_content_id}",
            200,
            auth=True,
            use_user_token=True
        )
        return success
        
    def test_remove_from_favorites(self):
        """Test removing content from favorites"""
        if not self.favorite_content_id:
            print("❌ No content ID available for remove favorite test")
            return False
            
        success, response = self.run_test(
            "Remove from Favorites",
            "DELETE",
            f"favorites/{self.favorite_content_id}",
            200,
            auth=True,
            use_user_token=True
        )
        return success
        
    def test_update_watch_progress(self):
        """Test updating watch progress"""
        if not self.favorite_content_id:
            print("❌ No content ID available for watch progress test")
            return False
            
        progress_data = {
            "watched_time": 300,  # 5 minutes
            "total_duration": 5400  # 90 minutes
        }
        
        success, response = self.run_test(
            "Update Watch Progress",
            "POST",
            f"watch-progress/{self.favorite_content_id}",
            200,
            data=progress_data,
            auth=True,
            use_user_token=True
        )
        return success
        
    def test_get_watch_progress(self):
        """Test getting watch progress"""
        if not self.favorite_content_id:
            print("❌ No content ID available for get watch progress test")
            return False
            
        success, response = self.run_test(
            "Get Watch Progress",
            "GET",
            f"watch-progress/{self.favorite_content_id}",
            200,
            auth=True,
            use_user_token=True
        )
        return success
        
    def test_get_continue_watching(self):
        """Test getting continue watching list"""
        success, response = self.run_test(
            "Get Continue Watching",
            "GET",
            "continue-watching",
            200,
            auth=True,
            use_user_token=True
        )
        return success

    def test_delete_content(self):
        """Test deleting a content"""
        if not self.content_id:
            print("❌ No content ID available for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Content",
            "DELETE",
            f"admin/contents/{self.content_id}",
            200
        )
        return success

def main():
    # Setup
    tester = StreamflixAPITester()
    
    # Run tests
    tester.test_health_check()
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1

    tester.test_get_current_user()
    tester.test_get_contents()
    
    if not tester.test_create_content():
        print("❌ Content creation failed")
    else:
        tester.test_update_content()
        tester.test_delete_content()

    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())