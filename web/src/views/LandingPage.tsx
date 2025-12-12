import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    Bot,
    Calendar,
    Zap,
    Shield,
    Clock,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    Users,
    BarChart3,
    FileText,
    ChevronRight,
    Star,
    Menu,
    X
} from 'lucide-react';

// Componente de partículas flutuantes
const FloatingParticle = ({ delay, duration, size }: { delay: number; duration: number; size: number }) => (
    <div
        className="absolute rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 blur-xl"
        style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${duration}s ease-in-out ${delay}s infinite`,
        }}
    />
);

// Header/Navbar
const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">
                            Át<span className="text-primary">imo</span>
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Recursos</a>
                        <a href="#pricing" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Preços</a>
                        <a href="#faq" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">FAQ</a>
                    </div>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        <a href="/login" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                            Entrar
                        </a>
                        <a
                            href="/login"
                            className="px-5 py-2.5 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-500 text-white font-semibold rounded-lg transition-all duration-300 text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50"
                        >
                            Começar Grátis
                        </a>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-slate-400 hover:text-white"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-white/10">
                        <div className="flex flex-col gap-4">
                            <a href="#features" className="text-slate-400 hover:text-white transition-colors text-sm font-medium px-2 py-2">Recursos</a>
                            <a href="#pricing" className="text-slate-400 hover:text-white transition-colors text-sm font-medium px-2 py-2">Preços</a>
                            <a href="#faq" className="text-slate-400 hover:text-white transition-colors text-sm font-medium px-2 py-2">FAQ</a>
                            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
                                <a href="/login" className="text-center text-slate-300 hover:text-white transition-colors text-sm font-medium py-2">
                                    Entrar
                                </a>
                                <a
                                    href="/login"
                                    className="text-center px-5 py-3 bg-gradient-to-r from-primary to-orange-600 text-white font-semibold rounded-lg text-sm"
                                >
                                    Começar Grátis
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

// Hero Section
const HeroSection = () => (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f10_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f10_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
                <FloatingParticle key={i} delay={i * 0.8} duration={20 + i * 3} size={150 + i * 50} />
            ))}
        </div>

        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full mb-8 animate-fade-in">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-slate-300 font-medium">Powered by Inteligência Artificial</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                    Atendimento Automático
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-yellow-500">
                    via WhatsApp
                </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in">
                Responda seus clientes 24/7 com IA. Agende compromissos, tire dúvidas e venda mais —
                tudo no <span className="text-white font-medium">piloto automático</span>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in">
                <a
                    href="/login"
                    className="group px-8 py-4 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-500 text-white font-bold rounded-xl transition-all duration-300 flex items-center gap-2 shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105"
                >
                    Começar Grátis
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                    href="#demo"
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-2"
                >
                    <MessageSquare className="w-5 h-5" />
                    Ver Demonstração
                </a>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    ))}
                </div>
                <p className="text-slate-500 text-sm">
                    <span className="text-white font-semibold">+500</span> empresas já usam o Átimo
                </p>
            </div>

            {/* Hero Image/Mockup */}
            <div className="mt-16 relative max-w-5xl mx-auto animate-fade-in">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-purple-500/20 to-primary/30 rounded-3xl blur-2xl opacity-50" />
                <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
                    <div className="bg-slate-950 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-white/5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="p-6 aspect-video flex items-center justify-center">
                            <div className="text-center">
                                <Bot className="w-20 h-20 text-primary mx-auto mb-4 opacity-50" />
                                <p className="text-slate-500 text-lg">Preview do Dashboard</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

// Features Section
const FeaturesSection = () => {
    const features = [
        {
            icon: Bot,
            title: 'IA Conversacional',
            description: 'Respostas naturais e humanizadas que seus clientes vão adorar. A IA entende contexto e mantém conversas fluidas.',
            color: 'from-primary to-orange-600'
        },
        {
            icon: Calendar,
            title: 'Agendamento Automático',
            description: 'Integração com Google Calendar. Seus clientes agendam direto pelo WhatsApp sem você precisar fazer nada.',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            icon: FileText,
            title: 'Base de Conhecimento',
            description: 'Faça upload de PDFs, documentos e FAQs. A IA aprende sobre seu negócio e responde com precisão.',
            color: 'from-purple-500 to-pink-500'
        },
        {
            icon: Zap,
            title: 'Respostas Instantâneas',
            description: 'Atenda milhares de clientes simultaneamente. Zero fila de espera, 100% de satisfação.',
            color: 'from-yellow-500 to-orange-500'
        },
        {
            icon: BarChart3,
            title: 'Dashboard Completo',
            description: 'Acompanhe métricas em tempo real: mensagens, agendamentos, taxa de resolução e muito mais.',
            color: 'from-green-500 to-emerald-500'
        },
        {
            icon: Shield,
            title: 'Seguro e Confiável',
            description: 'Seus dados protegidos com criptografia. Blacklist de números e controle total do atendimento.',
            color: 'from-slate-500 to-slate-600'
        }
    ];

    return (
        <section id="features" className="py-24 lg:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-4">
                        Recursos
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Tudo que você precisa para{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                            automatizar
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Uma plataforma completa para transformar seu atendimento via WhatsApp
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group p-6 bg-slate-900/50 hover:bg-slate-800/50 border border-white/5 hover:border-primary/30 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// How It Works Section
const HowItWorksSection = () => {
    const steps = [
        {
            step: '01',
            title: 'Conecte seu WhatsApp',
            description: 'Escaneie o QR Code e conecte seu número em segundos. Sem complicação.',
            icon: MessageSquare
        },
        {
            step: '02',
            title: 'Configure sua IA',
            description: 'Personalize o tom de voz, adicione sua base de conhecimento e pronto.',
            icon: Bot
        },
        {
            step: '03',
            title: 'Atenda no Piloto Automático',
            description: 'Relaxe enquanto a IA cuida dos seus clientes 24 horas por dia.',
            icon: Zap
        }
    ];

    return (
        <section className="py-24 lg:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-950" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[128px]" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-4">
                        Como Funciona
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Comece em <span className="text-primary">3 passos simples</span>
                    </h2>
                </div>

                {/* Steps */}
                <div className="grid md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <div key={index} className="relative">
                            {/* Connector Line */}
                            {index < steps.length - 1 && (
                                <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                            )}

                            <div className="text-center">
                                <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-orange-500/20 rounded-full blur-xl" />
                                    <div className="relative w-full h-full bg-slate-900 border border-white/10 rounded-full flex items-center justify-center">
                                        <step.icon className="w-10 h-10 text-primary" />
                                    </div>
                                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-white text-sm font-bold rounded-full flex items-center justify-center">
                                        {step.step}
                                    </span>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                                <p className="text-slate-400">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Pricing Section
const PricingSection = () => {
    const plans = [
        {
            name: 'Starter',
            price: 'Grátis',
            description: 'Para testar a plataforma',
            features: [
                '1 número de WhatsApp',
                '500 mensagens/mês',
                'Base de conhecimento básica',
                'Dashboard de métricas',
                'Suporte por email'
            ],
            cta: 'Começar Grátis',
            popular: false
        },
        {
            name: 'Pro',
            price: 'R$ 197',
            period: '/mês',
            description: 'Para negócios em crescimento',
            features: [
                '3 números de WhatsApp',
                'Mensagens ilimitadas',
                'Base de conhecimento avançada',
                'Integração Google Calendar',
                'Suporte prioritário',
                'Relatórios detalhados'
            ],
            cta: 'Assinar Agora',
            popular: true
        },
        {
            name: 'Enterprise',
            price: 'Sob consulta',
            description: 'Para grandes operações',
            features: [
                'WhatsApp ilimitado',
                'API personalizada',
                'Multi-usuários',
                'SLA garantido',
                'Onboarding dedicado',
                'Suporte 24/7'
            ],
            cta: 'Falar com Vendas',
            popular: false
        }
    ];

    return (
        <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-4">
                        Preços
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Escolha o plano <span className="text-primary">ideal</span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Comece grátis e escale conforme seu negócio cresce
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative p-8 rounded-2xl border transition-all duration-300 ${plan.popular
                                    ? 'bg-gradient-to-b from-primary/10 to-slate-900/50 border-primary/50 scale-105'
                                    : 'bg-slate-900/50 border-white/10 hover:border-white/20'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-sm font-semibold rounded-full">
                                    Mais Popular
                                </div>
                            )}

                            <div className="text-center mb-8">
                                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-2">
                                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                                    {plan.period && <span className="text-slate-400">{plan.period}</span>}
                                </div>
                                <p className="text-slate-400 text-sm">{plan.description}</p>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <a
                                href="/login"
                                className={`block w-full py-3 rounded-xl font-semibold text-center transition-all duration-300 ${plan.popular
                                        ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                            >
                                {plan.cta}
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// FAQ Section
const FAQSection = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs = [
        {
            question: 'Preciso ter conhecimento técnico para usar?',
            answer: 'Não! O Átimo foi feito para ser simples. Você conecta seu WhatsApp, configura algumas opções básicas e pronto. Tudo é visual e intuitivo.'
        },
        {
            question: 'A IA realmente responde como um humano?',
            answer: 'Sim! Nossa IA usa modelos de linguagem avançados que entendem contexto, gírias e nuances da conversa. Seus clientes vão pensar que estão falando com uma pessoa.'
        },
        {
            question: 'Posso intervir nas conversas quando quiser?',
            answer: 'Claro! Você pode assumir qualquer conversa a qualquer momento pelo painel. Também pode pausar a IA para números específicos ou configurar regras de quando transferir para atendimento humano.'
        },
        {
            question: 'Meus dados estão seguros?',
            answer: 'Sim, levamos segurança muito a sério. Todos os dados são criptografados e armazenados em servidores seguros. Não compartilhamos suas informações com terceiros.'
        },
        {
            question: 'Posso cancelar a qualquer momento?',
            answer: 'Sim! Não há fidelidade. Você pode cancelar sua assinatura quando quiser diretamente pelo painel, sem burocracia.'
        }
    ];

    return (
        <section id="faq" className="py-24 lg:py-32 relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-950" />

            <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-4">
                        FAQ
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Perguntas <span className="text-primary">Frequentes</span>
                    </h2>
                </div>

                {/* FAQ Accordion */}
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`border rounded-xl overflow-hidden transition-all duration-300 ${openIndex === index ? 'bg-slate-900/50 border-primary/30' : 'bg-slate-900/30 border-white/10'
                                }`}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left"
                            >
                                <span className="text-lg font-medium text-white">{faq.question}</span>
                                <ChevronRight className={`w-5 h-5 text-primary transition-transform duration-300 ${openIndex === index ? 'rotate-90' : ''
                                    }`} />
                            </button>
                            {openIndex === index && (
                                <div className="px-6 pb-5">
                                    <p className="text-slate-400 leading-relaxed">{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// CTA Section
const CTASection = () => (
    <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Pronto para automatizar seu{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                    atendimento?
                </span>
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                Junte-se a centenas de empresas que já economizam tempo e dinheiro com o Átimo.
                Comece agora mesmo, é grátis!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                    href="/login"
                    className="group px-8 py-4 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-500 text-white font-bold rounded-xl transition-all duration-300 flex items-center gap-2 shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105"
                >
                    Criar Conta Grátis
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                    href="mailto:contato@atimo.com.br"
                    className="px-8 py-4 text-slate-400 hover:text-white font-semibold transition-colors"
                >
                    Falar com Vendas
                </a>
            </div>
        </div>
    </section>
);

// Footer
const Footer = () => (
    <footer className="py-12 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white">
                        Át<span className="text-primary">imo</span>
                    </span>
                </div>

                {/* Links */}
                <div className="flex items-center gap-6 text-sm">
                    <a href="#" className="text-slate-400 hover:text-white transition-colors">Termos de Uso</a>
                    <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacidade</a>
                    <a href="mailto:contato@atimo.com.br" className="text-slate-400 hover:text-white transition-colors">Contato</a>
                </div>

                {/* Copyright */}
                <p className="text-slate-500 text-sm">
                    © 2024 Átimo. Todos os direitos reservados.
                </p>
            </div>
        </div>
    </footer>
);

// Main Landing Page Component
export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <HowItWorksSection />
            <PricingSection />
            <FAQSection />
            <CTASection />
            <Footer />

            {/* Global Animations */}
            <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(5deg);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-40px) translateX(-10px) rotate(-5deg);
            opacity: 0.7;
          }
          75% {
            transform: translateY(-20px) translateX(10px) rotate(3deg);
            opacity: 0.5;
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
};

export default LandingPage;
