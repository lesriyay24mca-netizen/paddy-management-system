(() => {
  const $ = id => document.getElementById(id);

  // ----- DATA -----
  const defaultProducts = [
    {name:"Basmati Rice",price:1315,weight:"10Kgs",image:"image/Basmati.png"},
    {name:"Wada Kolam",price:1050,weight:"25Kgs",image:"image/wada kolam.png"},
    {name:"Brown Rice",price:850,weight:"25Kgs",image:"image/brown rice.png"}
  ];

  function getUsers(){ return JSON.parse(localStorage.getItem("users")||"[]"); }
  function saveUsers(u){ localStorage.setItem("users",JSON.stringify(u)); }
  function getProducts(){ 
    if(!localStorage.getItem("products")) localStorage.setItem("products",JSON.stringify(defaultProducts)); 
    return JSON.parse(localStorage.getItem("products")||"[]"); 
  }
  function saveProducts(p){ localStorage.setItem("products",JSON.stringify(p)); }
  function getCart(){ return JSON.parse(localStorage.getItem("cart")||"[]"); }
  function saveCart(c){ localStorage.setItem("cart",JSON.stringify(c)); }
  function getOrders(){ return JSON.parse(localStorage.getItem("orders")||"[]"); }
  function saveOrders(o){ localStorage.setItem("orders",JSON.stringify(o)); }
  function currentUser(){ return JSON.parse(localStorage.getItem("loggedInUser")||"null"); }

  // ----- NAVIGATION -----
  window.navigate = function(page){
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    const target = document.querySelector(`section[data-page='${page}']`);
    if(target) target.classList.add('active');
    if(page==='products') renderProductGrid();
    updateAuthLink();
  };

  // ----- AUTH -----
  function updateAuthLink(){
    const el = $("authLink");
    const cartHeader = $("cartHeader");
    const user = currentUser();
    if(!el) return;
    if(user){
      el.innerHTML = `<a href="#" onclick="logout()">Logout</a>`;
      if(cartHeader) cartHeader.style.display = 'inline-block';
    } else {
      el.innerHTML = `<a href="#" onclick="navigate('login')">Login/Register</a>`;
      if(cartHeader) cartHeader.style.display = 'none';
    }
  }

  function registerHandler(e){
    e.preventDefault();
    const username=$("regUsername").value.trim();
    const password=$("regPassword").value;
    const confirm=$("regConfirmPassword").value;
    if(!username||!password||!confirm) return alert("Fill all fields.");
    if(password!==confirm) return alert("Passwords do not match.");
    const users=getUsers();
    if(users.find(u=>u.username===username)) return alert("Username exists.");
    users.push({username,password,role:"customer"});
    saveUsers(users);
    alert("Registered successfully."); navigate("login");
  }

  function loginHandler(e){
    e.preventDefault();
    const username=$("loginUsername").value.trim();
    const password=$("loginPassword").value;
    const users=getUsers();
    const user=users.find(u=>u.username===username && u.password===password);
    if(!user) return alert("Invalid credentials.");
    localStorage.setItem("loggedInUser",JSON.stringify(user));
    updateAuthLink();
    alert("Logged in successfully.");
    if(user.role==="admin") navigate("admin");
    else navigate("products");
  }

  function logout(){
    localStorage.removeItem("loggedInUser");
    updateAuthLink();
    navigate("home");
  }

  // ----- PRODUCTS -----
  function renderProductGrid(){
    const container=$("productGrid"); 
    if(!container) return;
    const products=getProducts(); 
    container.innerHTML="";
    
    products.forEach((p, idx) => {
      const card=document.createElement("div"); 
      card.className="product-card";
      const imgSrc=p.image || `https://via.placeholder.com/300x180?text=${encodeURIComponent(p.name)}`;
      card.innerHTML=`
        <img src="${imgSrc}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'"/>
        <h3>${p.name}</h3>
        <p>₹${p.price}</p>
        <p>${p.weight}</p>
        <div style="margin-top:8px;">
          <button class="btn addToCartBtn">Add to Cart</button>
          <button class="btn buyNowBtn">Buy Now</button>
        </div>
        <div class="message"></div>
      `;
      container.appendChild(card);

      card.querySelector(".addToCartBtn").addEventListener("click", () => addToCart(idx, card.querySelector(".addToCartBtn")));
      card.querySelector(".buyNowBtn").addEventListener("click", () => buyNow(idx));
    });
  }

  // ----- CART -----
  function renderCart(){
    const tbody=$("cartBody"); if(!tbody) return;
    const cart=getCart(); tbody.innerHTML="";
    if(cart.length===0){ 
      tbody.innerHTML=`<tr><td colspan="4">Your cart is empty.</td></tr>`; 
      updateCartCount(); 
      return; 
    }
    let grand=0;
    cart.forEach((it,i)=>{
      const total=it.qty*it.price; grand+=total;
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${it.productName}</td><td><button onclick="app.decreaseQty(${i})">−</button> ${it.qty} <button onclick="app.increaseQty(${i})">+</button></td><td>₹${it.price}</td><td>₹${total}</td>`;
      tbody.appendChild(tr);
    });
    const trTotal=document.createElement("tr");
    trTotal.innerHTML=`<td colspan="3"><b>Grand Total</b></td><td><b>₹${grand}</b></td>`;
    tbody.appendChild(trTotal);
    updateCartCount();
  }

  function updateCartCount(){
    const cart=$("cartCount") ? getCart() : [];
    if($("cartCount")) $("cartCount").innerText = cart.reduce((a,c)=>a+c.qty,0);
  }

  function addToCart(index, btn){
    const user=currentUser(); if(!user) return alert("Login to continue.");
    const products=getProducts(); const item=products[index];
    const cart=getCart();
    const existing=cart.find(c=>c.productName===item.name);
    if(existing) existing.qty+=1; else cart.push({productName:item.name,price:item.price,qty:1});
    saveCart(cart); renderCart();
    const msg=btn.parentElement.nextElementSibling; msg.style.display="block"; msg.innerText="Item added to cart";
    setTimeout(()=>{ msg.style.display="none"; },2000);
  }

  function buyNow(index){
    addToCart(index, document.querySelectorAll(".product-card .addToCartBtn")[index]);
    toggleCart();
  }
  function increaseQty(i){ const c=getCart(); c[i].qty+=1; saveCart(c); renderCart(); }
  function decreaseQty(i){ const c=getCart(); if(c[i].qty>1)c[i].qty-=1; else c.splice(i,1); saveCart(c); renderCart(); }
  function clearCart(){ if(confirm("Clear cart?")){ localStorage.removeItem("cart"); renderCart(); } }

  function placeOrder(){
    const cart=getCart(); const user=currentUser();
    if(!user) return alert("Login to continue.");
    if(cart.length===0) return alert("Cart empty.");
    const orders=getOrders();
    orders.push({customer:user.username,items:cart,time:new Date().toLocaleString()});
    saveOrders(orders);
    localStorage.removeItem("cart"); renderCart(); renderAdminOrders();
    alert("Order placed successfully!");
  }

  function toggleCart(){
    const cartEl=$("cartContainer");
    if(!cartEl) return;
    if(cartEl.style.display==='none'){ renderCart(); cartEl.style.display='block'; }
    else cartEl.style.display='none';
  }

  // ----- ADMIN DASHBOARD -----
  function renderAdminDashboard(){
    renderAdminProducts();
    renderAdminOrders();
    switchAdminTab('products');
    const metrics = $("adminMetrics");
    if(metrics){
      metrics.innerHTML = `<ul><li>Total users: ${getUsers().length}</li><li>Total products: ${getProducts().length}</li><li>Total orders: ${getOrders().length}</li></ul>`;
    }
  }

  function renderAdminProducts(){
    const tbody=$("adminProductTable"); const products=getProducts();
    tbody.innerHTML="";
    products.forEach((p,i)=>{
      const imgSrc=p.image||`https://via.placeholder.com/80x60?text=${encodeURIComponent(p.name)}`;
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td>${p.name}</td>
        <td>₹${p.price}</td>
        <td>${p.weight}</td>
        <td><img src="${imgSrc}" style="width:80px;border-radius:6px"/></td>
        <td>
          <button class="btn" onclick="app.editProduct(${i})">Edit</button>
          <button class="btn danger" onclick="app.adminDeleteProduct(${i})">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderAdminOrders(){
    const tbody=$("adminOrdersTable"); const orders=getOrders();
    tbody.innerHTML="";
    orders.forEach(o=>{
      const items=o.items.map(i=>`${i.productName} (x${i.qty})`).join(", ");
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${o.customer}</td><td>${items}</td><td>${o.time}</td>`;
      tbody.appendChild(tr);
    });
  }

  function editProduct(index){
    const products=getProducts(); const p=products[index];
    $("adminProductName").value=p.name;
    $("adminProductPrice").value=p.price;
    $("adminProductWeight").value=p.weight;
    $("adminImagePreview").src=p.image; $("adminImagePreview").style.display="block";
    products.splice(index,1); saveProducts(products); renderProductGrid();
  }

  function switchAdminTab(tab){
    $("adminProductsTab").style.display = tab==="products" ? "block":"none";
    $("adminOrdersTab").style.display = tab==="orders" ? "block":"none";
  }

  // ----- INIT -----
  document.addEventListener("DOMContentLoaded",()=>{
    if($("registerForm")) $("registerForm").addEventListener("submit",registerHandler);
    if($("loginForm")) $("loginForm").addEventListener("submit",loginHandler);
    if($("placeOrderBtn")) $("placeOrderBtn").addEventListener("click",placeOrder);

    // Admin add/update product
    if($("adminProductForm")){
      $("adminProductForm").addEventListener("submit",e=>{
        e.preventDefault();
        const name=$("adminProductName").value.trim();
        const price=$("adminProductPrice").value.trim();
        const weight=$("adminProductWeight").value.trim();
        const file=$("adminProductImage").files[0];
        if(!name||!price||!weight) return alert("Fill all fields");
        const products=getProducts();
        if(file){
          const reader=new FileReader();
          reader.onload=e=>{
            products.push({name,price:parseInt(price),weight,image:e.target.result});
            saveProducts(products); renderProductGrid(); renderAdminProducts();
            $("adminProductForm").reset(); $("adminImagePreview").style.display="none";
          };
          reader.readAsDataURL(file);
        } else {
          products.push({name,price:parseInt(price),weight,image:""});
          saveProducts(products); renderProductGrid(); renderAdminProducts(); $("adminProductForm").reset(); $("adminImagePreview").style.display="none";
        }
      });
    }

    updateAuthLink(); renderProductGrid(); renderAdminDashboard();
  });

  // ----- GLOBAL APP -----
  window.app = { addToCart, buyNow, increaseQty, decreaseQty, editProduct, logout };
  window.app.adminDeleteProduct = function(i){ const p=getProducts(); p.splice(i,1); saveProducts(p); renderProductGrid(); renderAdminProducts(); };

})();
