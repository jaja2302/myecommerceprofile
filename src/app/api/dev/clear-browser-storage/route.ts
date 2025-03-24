import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Cek apakah ini development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }
  
  // Validasi token (opsional)
  const token = request.nextUrl.searchParams.get('token');
  const devToken = process.env.DEBUG_TOKEN || 'dev-debug-token';
  if (token !== devToken) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
  
  // Buat HTML dengan JavaScript untuk membersihkan localStorage dan sessionStorage
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clear Browser Storage</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
          color: #333;
        }
        h1 {
          color: #2563eb;
        }
        .card {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        pre {
          background-color: #f0f0f0;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
        }
        button {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin-right: 8px;
        }
        button:hover {
          background-color: #1d4ed8;
        }
        button.danger {
          background-color: #dc2626;
        }
        button.danger:hover {
          background-color: #b91c1c;
        }
        .success {
          color: #16a34a;
          font-weight: bold;
        }
        .error {
          color: #dc2626;
          font-weight: bold;
        }
        #status {
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <h1>Clear Browser Storage</h1>
      
      <div class="card">
        <h2>Anon Chat & Browser Storage</h2>
        <p>Alat ini membantu membersihkan data yang disimpan di browser untuk keperluan debugging.</p>
        
        <div>
          <h3>Data localStorage Saat Ini:</h3>
          <pre id="localStorageData">Loading...</pre>
          
          <h3>Data sessionStorage Saat Ini:</h3>
          <pre id="sessionStorageData">Loading...</pre>
        </div>
        
        <div>
          <button id="clearLocalStorage">Hapus localStorage</button>
          <button id="clearSessionStorage">Hapus sessionStorage</button>
          <button id="clearCookies">Hapus Cookies</button>
          <button id="clearAll" class="danger">Hapus Semua Data Browser</button>
        </div>
        
        <div id="status"></div>
      </div>
      
      <div class="card">
        <h2>Spesifik Key Yang Diketahui</h2>
        <p>Item ini berkaitan dengan Anon Chat:</p>
        <ul id="knownKeys"></ul>
        <button id="clearAnonChatOnly">Hapus Data Anon Chat Saja</button>
      </div>
      
      <div class="card">
        <h2>Kembali</h2>
        <p>
          <a href="/mini-games/anon-chat">Kembali ke Anon Chat</a>
        </p>
      </div>
      
      <script>
        // Daftar kunci localStorage yang diketahui dari aplikasi
        const knownAnonChatKeys = [
          'anonchat_permanent_user_id',
          'anonchat_device_specific_id',
          'anonchat_user_data',
          'anonchat_active_connection',
          'app_browser_token',
          'current_firebase_id',
          'user_id_mappings'
        ];
        
        // Fungsi untuk menampilkan data localStorage
        function displayLocalStorageData() {
          const localStorageData = document.getElementById('localStorageData');
          try {
            let output = '';
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              let value = localStorage.getItem(key);
              
              // Mencoba parse JSON untuk pembacaan yang lebih baik
              try {
                const parsedValue = JSON.parse(value);
                value = JSON.stringify(parsedValue, null, 2);
              } catch (e) {
                // Bukan JSON, biarkan sebagai string
              }
              
              output += \`\${key}: \${value}\n\n\`;
            }
            localStorageData.textContent = output || 'No localStorage data';
          } catch (error) {
            localStorageData.textContent = 'Error reading localStorage: ' + error.message;
          }
        }
        
        // Fungsi untuk menampilkan data sessionStorage
        function displaySessionStorageData() {
          const sessionStorageData = document.getElementById('sessionStorageData');
          try {
            let output = '';
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              let value = sessionStorage.getItem(key);
              
              // Mencoba parse JSON untuk pembacaan yang lebih baik
              try {
                const parsedValue = JSON.parse(value);
                value = JSON.stringify(parsedValue, null, 2);
              } catch (e) {
                // Bukan JSON, biarkan sebagai string
              }
              
              output += \`\${key}: \${value}\n\n\`;
            }
            sessionStorageData.textContent = output || 'No sessionStorage data';
          } catch (error) {
            sessionStorageData.textContent = 'Error reading sessionStorage: ' + error.message;
          }
        }
        
        // Fungsi untuk menampilkan known keys
        function displayKnownKeys() {
          const knownKeysList = document.getElementById('knownKeys');
          knownKeysList.innerHTML = '';
          
          knownAnonChatKeys.forEach(key => {
            const value = localStorage.getItem(key);
            const li = document.createElement('li');
            li.innerHTML = \`<strong>\${key}:</strong> \${value ? 'Ada' : 'Tidak ada'}\`;
            knownKeysList.appendChild(li);
          });
        }
        
        // Fungsi untuk menampilkan status
        function showStatus(message, isError = false) {
          const statusElement = document.getElementById('status');
          statusElement.innerHTML = \`<p class="\${isError ? 'error' : 'success'}">\${message}</p>\`;
          
          // Refresh data setelah perubahan
          displayLocalStorageData();
          displaySessionStorageData();
          displayKnownKeys();
        }
        
        // Fungsi untuk menghapus cookies
        function clearCookies() {
          try {
            const cookies = document.cookie.split(";");
            
            for (let i = 0; i < cookies.length; i++) {
              const cookie = cookies[i];
              const eqPos = cookie.indexOf("=");
              const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
              document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
            }
            
            return true;
          } catch (error) {
            console.error('Error clearing cookies:', error);
            return false;
          }
        }
        
        // Setup event listeners
        document.addEventListener('DOMContentLoaded', function() {
          // Tampilkan data awal
          displayLocalStorageData();
          displaySessionStorageData();
          displayKnownKeys();
          
          // Clear localStorage
          document.getElementById('clearLocalStorage').addEventListener('click', function() {
            try {
              localStorage.clear();
              showStatus('localStorage berhasil dihapus!');
            } catch (error) {
              showStatus('Error clearing localStorage: ' + error.message, true);
            }
          });
          
          // Clear sessionStorage
          document.getElementById('clearSessionStorage').addEventListener('click', function() {
            try {
              sessionStorage.clear();
              showStatus('sessionStorage berhasil dihapus!');
            } catch (error) {
              showStatus('Error clearing sessionStorage: ' + error.message, true);
            }
          });
          
          // Clear cookies
          document.getElementById('clearCookies').addEventListener('click', function() {
            const success = clearCookies();
            if (success) {
              showStatus('Cookies berhasil dihapus!');
            } else {
              showStatus('Gagal menghapus cookies', true);
            }
          });
          
          // Clear all
          document.getElementById('clearAll').addEventListener('click', function() {
            try {
              localStorage.clear();
              sessionStorage.clear();
              const cookiesSuccess = clearCookies();
              
              if (cookiesSuccess) {
                showStatus('Semua data browser berhasil dihapus!');
              } else {
                showStatus('localStorage dan sessionStorage dihapus, tapi ada masalah dengan cookies', true);
              }
            } catch (error) {
              showStatus('Error clearing browser data: ' + error.message, true);
            }
          });
          
          // Clear Anon Chat data only
          document.getElementById('clearAnonChatOnly').addEventListener('click', function() {
            try {
              let itemsRemoved = 0;
              
              knownAnonChatKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                  localStorage.removeItem(key);
                  itemsRemoved++;
                }
              });
              
              showStatus(\`\${itemsRemoved} item data Anon Chat berhasil dihapus!\`);
            } catch (error) {
              showStatus('Error clearing Anon Chat data: ' + error.message, true);
            }
          });
        });
      </script>
    </body>
    </html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 