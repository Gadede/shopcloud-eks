# ShopCloud — E-Commerce Microservices on AWS EKS

![AWS EKS](https://img.shields.io/badge/AWS-EKS-orange?logo=amazon-aws)
![Kubernetes](https://img.shields.io/badge/Kubernetes-1.31-blue?logo=kubernetes)
![Terraform](https://img.shields.io/badge/Terraform-6.0-purple?logo=terraform)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue?logo=docker)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI/CD-green?logo=github-actions)

A production-grade e-commerce platform built with microservices architecture, deployed on AWS Elastic Kubernetes Service (EKS). This project demonstrates end-to-end DevOps practices including containerization, infrastructure as code, Kubernetes orchestration, and automated CI/CD pipelines.

---

## 🏗️ Architecture Overview

```
Internet
    │
    ▼
AWS Application Load Balancer (ALB)
    │
    ▼
EKS Cluster — 3x t3.small nodes
    │
    ├── Frontend Service          (React + nginx,     port 80)
    ├── Product Service           (Node.js Express,   port 3001)
    ├── Order Service             (Node.js Express,   port 3002)
    ├── User Service              (Node.js + JWT,     port 3003)
    ├── Payment Service           (Node.js Express,   port 3004)
    └── Notification Service      (Node.js Express,   port 3005)

Supporting Infrastructure:
    ├── AWS ECR          — 6 private Docker image repositories
    ├── AWS VPC          — Public/private subnets across 2 AZs
    ├── AWS IAM          — OIDC-based roles, no long-lived keys
    └── Terraform S3     — Remote state with DynamoDB locking
```

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Frontend** | React 18, nginx |
| **Backend** | Node.js 18, Express.js |
| **Containerization** | Docker, multi-stage builds |
| **Orchestration** | Kubernetes 1.31 on AWS EKS |
| **Infrastructure** | Terraform (native AWS resources) |
| **Image Registry** | AWS ECR |
| **CI/CD** | GitHub Actions with OIDC authentication |
| **Networking** | AWS VPC, ALB, AWS Load Balancer Controller |
| **Auth** | JWT tokens (User Service), OIDC (GitHub → AWS) |
| **Autoscaling** | Kubernetes HPA (Horizontal Pod Autoscaler) |

---

## 📦 Microservices

### 1. Frontend Service
- React 18 single-page application
- Built with multi-stage Docker build (Node builder → nginx server)
- Serves static assets with gzip compression
- React Router support via nginx `try_files`

### 2. Product Service (port 3001)
- Product catalog CRUD operations
- Category filtering and price range queries
- Stock management with atomic updates
- Endpoints: `GET /products`, `GET /products/:id`, `POST /products`, `PATCH /products/:id/stock`

### 3. Order Service (port 3002)
- Full order lifecycle management
- Async status updates (processing → confirmed → delivered)
- Calls Notification Service on order creation
- Endpoints: `GET /orders/user/:userId`, `POST /orders`, `PATCH /orders/:id/status`

### 4. User Service (port 3003)
- JWT-based authentication (register, login, profile)
- bcrypt password hashing
- Token expiry: 7 days
- Endpoints: `POST /auth/register`, `POST /auth/login`, `GET /users/me`

### 5. Payment Service (port 3004)
- Luhn algorithm card validation
- Simulated payment processing with 5% failure rate
- Refund support
- Test card: `4242424242424242`
- Endpoints: `POST /payments/process`, `POST /payments/:id/refund`

### 6. Notification Service (port 3005)
- In-memory async queue (production: replace with AWS SQS)
- Email templates for order events
- Queue processed every 2 seconds
- Endpoints: `POST /notifications`, `GET /notifications/user/:userId`

---

## 📁 Project Structure

```
shopcloud-eks/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # CI/CD: test → build → push → deploy
│       └── terraform.yml       # Infrastructure pipeline
├── services/
│   ├── frontend/               # React app + nginx
│   │   ├── src/
│   │   │   ├── App.jsx         # Main React component
│   │   │   └── App.css         # Dark theme styles
│   │   ├── Dockerfile          # Multi-stage build
│   │   └── nginx.conf          # nginx configuration
│   ├── product-service/        # Product catalog API
│   ├── order-service/          # Order management API
│   ├── user-service/           # Auth + user profiles
│   ├── payment-service/        # Payment processing
│   └── notification-service/   # Email/SMS notifications
├── terraform/
│   ├── main.tf                 # VPC, EKS, ECR, IAM (native resources)
│   ├── variables.tf            # Input variables
│   └── outputs.tf              # Cluster name, ECR URLs, kubectl command
├── k8s/
│   └── base/
│       ├── namespace.yaml      # shopcloud namespace
│       ├── deployments.yaml    # 6 service deployments
│       ├── services.yaml       # ClusterIP services
│       ├── ingress.yaml        # AWS ALB ingress
│       └── hpa-and-secrets.yaml # Autoscaling + secrets
├── docker-compose.yml          # Local development environment
└── .gitignore
```

---

## 🚀 Deployment Stages

### Stage 1 — Local Development

All 6 services run locally with Docker Compose for rapid development and testing.

```bash
# Start all services
docker-compose up --build

# Access the website
open http://localhost:3000

# Test individual service APIs
curl http://localhost:3001/products
curl http://localhost:3001/health
```

**What was built:**
- React frontend with product browsing, cart, login, and order placement
- 5 Node.js microservices with REST APIs
- Docker multi-stage build for frontend (reduces image size from ~400MB to ~25MB)
- Docker Compose orchestration for local development
- Health check endpoints on every service

---

### Stage 2 — AWS Infrastructure with Terraform

Infrastructure provisioned as code using native AWS Terraform resources.

```bash
cd terraform

# Initialize — downloads providers, connects to S3 backend
terraform init

# Preview all changes
terraform plan

# Create all AWS resources (~15-20 minutes)
terraform apply
```

**Resources created (40+ total):**

| Resource | Count | Purpose |
|---|---|---|
| VPC | 1 | Isolated network |
| Public subnets | 2 | Load balancer, NAT gateway |
| Private subnets | 2 | EKS worker nodes |
| Internet Gateway | 1 | Public internet access |
| NAT Gateway | 1 | Private subnet outbound traffic |
| EKS Cluster | 1 | Kubernetes control plane |
| EKS Node Group | 1 | 3x t3.small worker nodes |
| EKS Addons | 3 | vpc-cni, coredns, kube-proxy |
| IAM Roles | 2 | Cluster role, node role |
| Security Groups | 2 | Cluster SG, nodes SG |
| ECR Repositories | 6 | One per microservice |
| S3 Bucket | 1 | Terraform remote state |
| DynamoDB Table | 1 | Terraform state locking |

**Key Terraform decisions:**
- Used native `aws_eks_cluster` resource instead of community module to avoid v20/v21 breaking changes
- Private subnets for worker nodes (nodes not directly internet-accessible)
- `endpoint_public_access = true` with `endpoint_private_access = true` for kubectl access
- ECR lifecycle policy keeps last 10 images to control storage costs

---

### Stage 3 — Docker Images pushed to AWS ECR

Each service packaged as a Docker image and stored in AWS ECR.

```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  882434014807.dkr.ecr.us-east-2.amazonaws.com

# Build and push all 6 services
for SERVICE in frontend product-service order-service \
  user-service payment-service notification-service; do
  docker build -t 882434014807.dkr.ecr.us-east-2.amazonaws.com/shopcloud/$SERVICE:latest \
    ./services/$SERVICE
  docker push 882434014807.dkr.ecr.us-east-2.amazonaws.com/shopcloud/$SERVICE:latest
done
```

**Image sizes after multi-stage builds:**

| Service | Base Image | Final Size |
|---|---|---|
| frontend | nginx:alpine | ~25MB |
| product-service | node:18-alpine | ~120MB |
| order-service | node:18-alpine | ~120MB |
| user-service | node:18-alpine | ~125MB |
| payment-service | node:18-alpine | ~118MB |
| notification-service | node:18-alpine | ~115MB |

---

### Stage 4 — Kubernetes Deployment to EKS

All services deployed to the EKS cluster using Kubernetes manifests.

```bash
# Connect kubectl to the cluster
aws eks update-kubeconfig --region us-east-2 --name shopcloud-prod

# Deploy all resources
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/hpa-and-secrets.yaml
kubectl apply -f k8s/base/deployments.yaml
kubectl apply -f k8s/base/services.yaml
kubectl apply -f k8s/base/ingress.yaml

# Verify all pods running
kubectl get pods -n shopcloud
```

**Kubernetes resources deployed:**

| Resource | Count | Details |
|---|---|---|
| Namespace | 1 | `shopcloud` |
| Deployments | 6 | One per service |
| Pods | 11 | 2 replicas most services, 1 for notification |
| Services | 6 | ClusterIP for internal communication |
| Ingress | 1 | AWS ALB internet-facing |
| HPA | 3 | CPU-based autoscaling (70% threshold) |
| Secret | 1 | JWT secret |

**Key Kubernetes decisions:**
- ClusterIP services for internal service-to-service communication
- Single ALB ingress with path-based routing to each service
- HPA configured to scale between 2-8 replicas based on CPU
- Resource requests/limits tuned for t3.small nodes (2GB RAM)
- Readiness and liveness probes on every deployment

---

### Stage 5 — AWS Load Balancer Controller

Installed via Helm to enable ALB provisioning from Kubernetes Ingress resources.

```bash
# Associate OIDC provider with cluster
eksctl utils associate-iam-oidc-provider \
  --region us-east-2 --cluster shopcloud-prod --approve

# Create IAM service account
eksctl create iamserviceaccount \
  --cluster shopcloud-prod \
  --namespace kube-system \
  --name aws-load-balancer-controller \
  --attach-policy-arn arn:aws:iam::882434014807:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve --region us-east-2

# Install controller via Helm
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=shopcloud-prod \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=us-east-2 \
  --set vpcId=vpc-07b60fef1e7f4df69 \
  --disable-openapi-validation
```

---

### Stage 6 — CI/CD Pipeline with GitHub Actions + OIDC

Fully automated deployment pipeline triggered on every push to `main`.

**OIDC Authentication (no long-lived AWS keys):**

Instead of storing AWS access keys as GitHub secrets, the pipeline uses OpenID Connect (OIDC) to assume an IAM role temporarily. Each pipeline run gets a short-lived token that expires automatically.

```
GitHub push to main
      ↓
GitHub generates OIDC token for repo:Gadede/shopcloud-eks
      ↓
AWS verifies token against OIDC provider
      ↓
AWS issues temporary credentials (1 hour)
      ↓
Pipeline builds, pushes, deploys
      ↓
Credentials expire automatically
```

**Pipeline stages:**

```yaml
Test → Build & Push → Deploy
```

| Stage | What happens |
|---|---|
| **Test** | `npm ci` on all 5 backend services |
| **Build & Push** | Docker builds all 6 images, pushes to ECR with `main-XXXXXXXX` tag |
| **Deploy** | `kubectl apply` all manifests, waits for rollout, prints ALB URL |

**GitHub Secrets used:**

| Secret | Value |
|---|---|
| `AWS_ROLE_ARN` | `arn:aws:iam::882434014807:role/shopcloud-github-actions` |
| `AWS_ACCOUNT_ID` | `882434014807` |

No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` — OIDC eliminates the need for long-lived credentials entirely.

---

## 🔧 Local Development Setup

### Prerequisites

- Node.js 18+
- Docker Desktop
- AWS CLI v2
- Terraform >= 1.5
- kubectl
- eksctl
- Helm 3

### Run locally

```bash
# Clone the repository
git clone https://github.com/Gadede/shopcloud-eks.git
cd shopcloud-eks

# Install dependencies for all services
for SERVICE in frontend product-service order-service \
  user-service payment-service notification-service; do
  cd services/$SERVICE && npm install && cd ../..
done

# Start all services
docker-compose up --build

# Open the website
open http://localhost:3000
```

### Test credentials

```
Email:    demo@shopcloud.com
Password: demo1234
Test card: 4242424242424242
```

---

## 📊 Kubernetes Operations

```bash
# View all resources
kubectl get all -n shopcloud

# View pod logs
kubectl logs deployment/product-service -n shopcloud

# Shell into a pod
kubectl exec -it deployment/frontend -n shopcloud -- sh

# Scale a service
kubectl scale deployment/product-service --replicas=4 -n shopcloud

# Rolling restart
kubectl rollout restart deployment/frontend -n shopcloud

# Rollback
kubectl rollout undo deployment/frontend -n shopcloud

# View rollout history
kubectl rollout history deployment/frontend -n shopcloud
```

---

## 💰 AWS Cost Estimate

| Resource | Cost/hour | Cost/day |
|---|---|---|
| EKS Control Plane | $0.10 | $2.40 |
| 3x t3.small nodes | $0.062 | $1.49 |
| NAT Gateway | $0.045 | $1.08 |
| ALB | $0.025 | $0.60 |
| ECR storage | ~$0.01 | ~$0.24 |
| **Total** | **~$0.24** | **~$5.81** |

### Save costs when not in use

```bash
# Scale all deployments to zero
kubectl scale deployment --all --replicas=0 -n shopcloud

# Scale back up
kubectl scale deployment --all --replicas=1 -n shopcloud
```

---

## 🧹 Cleanup

```bash
# Delete all Kubernetes resources
kubectl delete namespace shopcloud

# Destroy all AWS infrastructure
cd terraform
terraform destroy

# Delete ECR images
for SERVICE in frontend product-service order-service \
  user-service payment-service notification-service; do
  aws ecr batch-delete-image \
    --repository-name shopcloud/$SERVICE \
    --image-ids imageTag=latest \
    --region us-east-2
done

# Delete S3 state bucket
aws s3 rm s3://shopcloud-terraform-state-60226 --recursive
aws s3 rb s3://shopcloud-terraform-state-60226
```

---

## 🎯 Key DevOps Concepts Demonstrated

| Concept | Implementation |
|---|---|
| **Infrastructure as Code** | Terraform provisions all AWS resources declaratively |
| **Containerization** | Docker multi-stage builds minimize image size |
| **Container Orchestration** | Kubernetes manages scheduling, scaling, self-healing |
| **Service Discovery** | Kubernetes DNS for inter-service communication |
| **Zero-downtime Deployments** | Rolling updates with readiness probes |
| **Auto-scaling** | HPA scales pods based on CPU utilization |
| **Self-healing** | Kubernetes restarts failed pods automatically |
| **Least Privilege** | OIDC eliminates long-lived credentials |
| **GitOps** | Every infrastructure change goes through git |
| **Immutable Infrastructure** | New deployment = new Docker image, never patch in place |

---

## 📝 Lessons Learned

- **EKS module v21 breaking changes** — Switched from `terraform-aws-modules/eks` to native `aws_eks_cluster` resources to avoid incompatibilities between module v21 and AWS provider v6
- **OIDC vs access keys** — OIDC is more secure and eliminates secret rotation concerns
- **Network timeouts** — University/corporate networks block EKS API server port 443; mobile hotspot required for direct kubectl access
- **t3.small memory constraints** — 2GB RAM requires careful resource request tuning; 3 nodes needed to run all system pods plus 6 application services
- **ALB provisioning** — AWS Load Balancer Controller must be installed before Ingress resources can provision ALBs

---

## 👤 Author

**Richlove Samuel Soglo**  
GitHub: [@Gadede](https://github.com/Gadede)

---

## 📄 License

MIT License — free to use as a reference for your own projects.