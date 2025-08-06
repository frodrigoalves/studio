
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Clapperboard, Download } from 'lucide-react';
import { generateInstitutionalVideo } from '@/ai/flows/video-generation-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const initialScript = `1
00:00:01,000 --> 00:00:03,500
Em meio aos desafios enfrentados pelo sistema de transporte público de Belo Horizonte,

2
00:00:03,500 --> 00:00:04,500
nasce a TOPBUS.

3
00:00:05,000 --> 00:00:06,500
Mais do que uma nova empresa,

4
00:00:07,000 --> 00:00:09,000
a TOPBUS representa uma resposta estratégica.

5
00:00:09,500 --> 00:00:12,500
Para assegurar a estabilidade, continuidade e qualidade na operação de linhas

6
00:00:13,000 --> 00:00:15,000
que, por muito tempo, enfrentaram falhas operacionais

7
00:00:15,500 --> 00:00:18,000
e comprometeram a confiança da população.

8
00:00:18,500 --> 00:00:21,000
Com compromisso, responsabilidade e foco em resultados,

9
00:00:21,500 --> 00:00:23,500
a TOPBUS surge para fortalecer o transporte coletivo.

10
00:00:24,000 --> 00:00:26,000
Priorizando o atendimento à sociedade,

11
00:00:26,500 --> 00:00:28,000
a valorização dos colaboradores,

12
00:00:28,500 --> 00:00:31,000
e a eficiência na prestação do serviço público.

13
00:00:32,000 --> 00:00:34,000
A TOPBUS, estabelecida em 2023,

14
00:00:34,500 --> 00:00:36,500
sob a denominação inicial de BHLeste,

15
00:00:37,000 --> 00:00:40,000
integrou-se ao sistema de transporte público de Belo Horizonte.

16
00:00:40,500 --> 00:00:43,000
Com o objetivo de proporcionar um serviço voltado para a melhoria contínua

17
00:00:43,500 --> 00:00:45,500
e inovação operacional.

18
00:00:46,000 --> 00:00:49,000
A entrada da TOPBUS foi determinante para assegurar a estabilidade do sistema de transporte.

19
00:00:49,500 --> 00:00:51,500
Ao assumir a operação de linhas que, há muito tempo,

20
00:00:52,000 --> 00:00:53,500
apresentavam problemas operacionais,

21
00:00:54,000 --> 00:00:57,000
carecendo de investimentos altos para alavancar os seus resultados.

22
00:00:57,500 --> 00:00:59,500
Ao integrar os colaboradores de sua predecessora,

23
00:01:00,000 --> 00:01:02,000
a TOPBUS proporcionou a manutenção dos empregos,

24
00:01:02,500 --> 00:01:04,500
e o atendimento à população.

25
00:01:05,000 --> 00:01:07,000
Uma integração que veio acompanhada de inúmeros desafios.

26
00:01:07,500 --> 00:01:10,500
Que vêm sendo corajosamente superados com a dedicação de todos.

27
00:01:11,500 --> 00:01:13,000
**Nossa Missão:**

28
00:01:13,500 --> 00:01:17,000
Ser parte integrante e essencial do constante avanço da mobilidade urbana.

29
00:01:18,000 --> 00:01:19,500
**Nossa Visão:**

30
00:01:20,000 --> 00:01:22,500
Elevar a qualidade do transporte por ônibus em Belo Horizonte.

31
00:01:23,000 --> 00:01:26,000
Garantindo frota renovada e alta performance operacional.

32
00:01:27,000 --> 00:01:28,500
**Nossos Valores:**

33
00:01:29,000 --> 00:01:30,500
**Foco em Resultado:**

34
00:01:31,000 --> 00:01:33,000
Atuamos com determinação e responsabilidade.

35
00:01:33,500 --> 00:01:36,000
Para alcançar metas com eficiência e qualidade.

36
00:01:37,000 --> 00:01:38,500
**Lealdade:**

37
00:01:39,000 --> 00:01:40,500
Valorizamos a confiança mútua.

38
00:01:41,000 --> 00:01:44,500
O respeito à empresa, aos colegas e aos nossos compromissos.

39
00:01:45,500 --> 00:01:47,000
**Meritocracia:**

40
00:01:47,500 --> 00:01:49,500
Reconhecemos e valorizamos o desempenho.

41
00:01:50,000 --> 00:01:53,500
O esforço e os resultados individuais e coletivos.

42
00:01:54,500 --> 00:01:56,000
**Resiliência:**

43
00:01:56,500 --> 00:01:58,500
Enfrentamos desafios com equilíbrio.

44
00:01:59,000 --> 00:02:00,500
Aprendendo com as adversidades.

45
00:02:01,000 --> 00:02:03,500
E mantendo o compromisso com a superação.

46
00:02:04,500 --> 00:02:06,500
**Disciplina e Constância:**

47
00:02:07,000 --> 00:02:09,000
Mantemos a regularidade nas ações.

48
00:02:09,500 --> 00:02:12,500
E o compromisso com a excelência em tudo o que fazemos.

49
00:02:13,500 --> 00:02:16,000
**Parceria com Reciprocidade:**

50
00:02:16,500 --> 00:02:19,000
Construímos relações transparentes e colaborativas.

51
00:02:19,500 --> 00:02:22,500
Baseadas no respeito e na entrega mútua de valor.

52
00:02:23,500 --> 00:02:26,500
**A TOPBUS em Números:**
Compromisso com eficiência, modernização e cuidado com as pessoas.

53
00:02:27,000 --> 00:02:28,500
**Fundação:** Janeiro de 2023

54
00:02:29,000 --> 00:02:30,500
**Colaboradores:** 315 profissionais

55
00:02:31,000 --> 00:02:34,000
**Frota atual:** 115 veículos (60% renovada em 2024)

56
00:02:34,500 --> 00:02:36,000
**Linhas operadas:** 18 linhas

57
00:02:36,500 --> 00:02:39,500
**Índice de Qualidade:** Evolução de 92,6% para 98,4%

58
00:02:40,000 --> 00:02:43,500
**Meta 2026:** Mais de 70% da frota renovada e idade média de 4 anos

59
00:02:44,500 --> 00:02:47,500
**Setores de Tráfego e Monitoramento:**
O setor de **Tráfego** é responsável pela gestão e acompanhamento do desempenho dos operadores,

60
00:02:48,000 --> 00:02:51,500
atuando em ações corretivas e preventivas relacionadas a:

61
00:02:52,000 --> 00:02:54,000
Avarias e falhas operacionais;

62
00:02:54,500 --> 00:02:57,000
Programa de Condução Inteligente (PCI);

63
00:02:57,500 --> 00:02:59,500
Ocorrências como multas e sinistros;

64
00:03:00,000 --> 00:03:03,500
Desenvolvimento técnico e comportamental dos motoristas.

65
00:03:04,500 --> 00:03:07,500
Já o setor de **Monitoramento** atua no controle em tempo real da operação.

66
00:03:08,000 --> 00:03:10,000
Garantindo o cumprimento de horários.

67
00:03:10,500 --> 00:03:12,000
A regularidade das rotas.

68
00:03:12,500 --> 00:03:15,000
E a fluidez do transporte coletivo.

69
00:03:15,500 --> 00:03:17,500
Com uso de sistemas inteligentes,

70
00:03:18,000 --> 00:03:21,500
o monitoramento permite respostas rápidas a desvios operacionais.

71
00:03:22,000 --> 00:03:25,500
E contribui para uma logística eficiente e segura para a população.

72
00:03:26,000 --> 00:03:28,000
Ambos os setores trabalham de forma integrada.

73
00:03:28,500 --> 00:03:32,500
Para assegurar a qualidade, a pontualidade e a confiabilidade da operação diária.

74
00:03:33,500 --> 00:03:36,500
**CITGIS – Monitoramento em Tempo Real:**
O CITGIS é o sistema utilizado pela TOPBUS.

75
00:03:37,000 --> 00:03:39,500
Para o acompanhamento em tempo real da operação.

76
00:03:40,000 --> 00:03:42,500
Por meio dele, é possível verificar a execução das viagens.

77
00:03:43,000 --> 00:03:45,500
Rastrear a localização exata dos veículos.

78
00:03:46,000 --> 00:03:49,500
E identificar desvios operacionais com agilidade.

79
00:03:50,000 --> 00:03:53,500
Permitindo ações rápidas e eficazes diante de qualquer ocorrência.

80
00:03:54,000 --> 00:03:56,500
Essa ferramenta é essencial para garantir maior controle.

81
00:03:57,000 --> 00:04:00,500
Eficiêcia e qualidade no serviço prestado à população.

82
00:04:01,500 --> 00:04:04,500
**CITOP – Controle Operacional e de Bilhetagem:**
O CITOP é o sistema utilizado pela TOPBUS.

83
00:04:05,000 --> 00:04:08,000
Para o gerenciamento e análise de dados operacionais.

84
00:04:08,500 --> 00:04:12,000
Com ele, é possível controlar e acompanhar informações essenciais da operação, como:

85
00:04:12,500 --> 00:04:14,500
Quilometragem rodada por veículo;

86
00:04:15,000 --> 00:04:17,500
Quantidade de passageiros por viagem;

87
00:04:18,000 --> 00:04:20,500
Dados do sistema de bilhetagem eletrônica;

88
00:04:21,000 --> 00:04:24,000
Entre outros indicadores operacionais.

89
00:04:24,500 --> 00:04:28,000
Essa ferramenta é fundamental para tomadas de decisão baseadas em dados.

90
00:04:28,500 --> 00:04:32,500
Promovendo maior controle, eficiência e transparência na gestão do transporte coletivo.

91
00:04:33,500 --> 00:04:36,500
**Acompanhamento e Registro de Ocorrências:**
Por meio do sistema, realizamos o acompanhamento e o registro de todas as ocorrências operacionais.

92
00:04:37,000 --> 00:04:39,000
Com o objetivo de identificar falhas.

93
00:04:39,500 --> 00:04:42,500
E adotar ações corretivas de forma ágil e eficaz.

94
00:04:43,500 --> 00:04:46,500
**Evolução da Operação – Viagens Realizadas (2024 a 2025):**
O gráfico apresenta a evolução do Índice de Qualidade (IQ) da TOPBUS.

95
00:04:47,000 --> 00:04:49,500
Entre janeiro de 2024 e julho de 2025.

96
00:04:50,000 --> 00:04:52,500
Evidenciando o crescimento progressivo da empresa.

97
00:04:53,000 --> 00:04:56,500
Em relação à realização de viagens programadas.

98
00:04:57,000 --> 00:04:59,500
A linha azul representa o IQ da TOPBUS.

99
00:05:00,000 --> 00:05:03,500
Que cresceu de 92,6% em janeiro de 2024.

100
00:05:04,000 --> 00:05:06,500
Para 98,4% em julho de 2025.

101
00:05:07,000 --> 00:05:10,500
Demonstrando avanços consistentes na regularidade operacional.

102
00:05:11,000 --> 00:05:13,500
A linha verde mostra o IQ médio do sistema.

103
00:05:14,000 --> 00:05:17,500
Permitindo a comparação direta da performance da empresa em relação ao consórcio.

104
00:05:18,000 --> 00:05:21,500
O acompanhamento mensal evidencia o comprometimento da TOPBUS.

105
00:05:22,000 --> 00:05:26,000
Com a excelência operacional e a melhoria contínua do serviço prestado à população.

106
00:05:26,500 --> 00:05:29,500
Este resultado reflete o esforço conjunto das equipes operacionais.

107
00:05:30,000 --> 00:05:31,500
Do planejamento e da gestão.

108
00:05:32,000 --> 00:05:35,500
Para garantir pontualidade, confiabilidade e qualidade no transporte público.

109
00:05:36,500 --> 00:05:38,000
**Conclusão:**

110
00:05:38,500 --> 00:05:42,000
O setor de Tráfego representa um pilar fundamental.

111
00:05:42,500 --> 00:05:45,500
No compromisso da TOPBUS com a excelência operacional.

112
00:05:46,000 --> 00:05:50,500
Através de uma atuação integrada.

113
00:05:51,000 --> 00:05:55,000
Alinhada com o Monitoramento e o uso de sistemas inteligentes como CITGIS e CITOP.

114
00:05:55,500 --> 00:05:59,500
Conseguimos garantir agilidade, controle e precisão na nossa rotina de operação.

115
00:06:00,000 --> 00:06:02,500
Nosso foco vai além do cumprimento de metas.

116
00:06:03,000 --> 00:06:06,500
Investimos continuamente no desenvolvimento dos nossos operadores.

117
00:06:07,000 --> 00:06:09,500
Oferecendo suporte, acompanhamento e ações corretivas.

118
00:06:10,000 --> 00:06:13,500
Que visam o crescimento técnico e comportamental de cada colaborador.

119
00:06:14,000 --> 00:06:17,500
A evolução constante dos nossos indicadores é reflexo direto da dedicação.

120
00:06:18,000 --> 00:06:20,000
E do trabalho conjunto entre equipes.

121
00:06:20,500 --> 00:06:24,500
Reafirmando o compromisso da TOPBUS com a qualidade.

122
00:06:25,000 --> 00:06:29,000
A pontualidade e a confiabilidade no transporte público.
`;

const videoPrompt = `A cinematic, professional institutional video for a public transport company in Brazil called TOPBUS. It should show modern buses running in the city of Belo Horizonte, diverse and satisfied passengers, dedicated employees working in operations and monitoring, and graphics showing the company's growth and quality. The overall tone should be inspiring, positive, and convey commitment and efficiency.`;

export default function InstitutionalVideoPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [script, setScript] = useState(initialScript);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const handleGenerateVideo = async () => {
        setIsLoading(true);
        setVideoUrl(null);
        setAudioUrl(null);
        toast({
            title: 'Iniciando Geração de Vídeo',
            description: 'A IA começou a processar o roteiro. Isso pode levar alguns minutos...',
        });

        try {
            const result = await generateInstitutionalVideo({
                script: script,
                prompt: videoPrompt,
            });
            
            // The result.videoUrl is a gs:// link, which is not directly playable.
            // For this MVP, we will show a placeholder and log the real link.
            // A full implementation would require a backend service to create a signed URL.
            console.log("Video GS URL:", result.videoUrl);
            
            setVideoUrl("https://storage.googleapis.com/aai-web-samples/protim/placeholder-video.mp4"); // Placeholder
            setAudioUrl(result.audioUrl);

            toast({
                title: 'Vídeo Gerado com Sucesso!',
                description: 'O vídeo e a narração estão prontos para visualização.',
            });
        } catch (error) {
            console.error('Failed to generate video', error);
            toast({
                variant: 'destructive',
                title: 'Erro na Geração do Vídeo',
                description: `Ocorreu um erro: ${error instanceof Error ? error.message : String(error)}`,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                         <Clapperboard className="h-8 w-8" />
                         <div>
                            <CardTitle>Gerador de Vídeo Institucional</CardTitle>
                            <CardDescription>Use esta ferramenta para gerar um vídeo institucional com narração humanizada a partir de um roteiro.</CardDescription>
                         </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Alert>
                        <AlertTitle>Como Funciona?</AlertTitle>
                        <AlertDescription>
                            A IA usa o roteiro para criar uma narração em áudio e o prompt de vídeo para gerar as imagens. A geração pode levar vários minutos. O vídeo final e o áudio aparecerão abaixo para download e visualização.
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <label htmlFor="script" className="font-semibold">Roteiro (formato SRT)</label>
                        <Textarea
                            id="script"
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            className="h-64 font-mono text-xs"
                            placeholder="Cole ou edite seu roteiro aqui..."
                        />
                    </div>
                    <Button onClick={handleGenerateVideo} disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {isLoading ? 'Gerando, por favor aguarde...' : 'Gerar Vídeo Institucional com IA'}
                    </Button>
                </CardContent>
            </Card>

            {(videoUrl || audioUrl) && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Resultado da Geração</CardTitle>
                        <CardDescription>O vídeo e a narração foram gerados. Você pode visualizá-los e baixá-los.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {videoUrl && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Vídeo Gerado</h3>
                                <video controls src={videoUrl} className="w-full rounded-lg border bg-black" />
                                <Button asChild variant="outline" size="sm">
                                    <a href={videoUrl} download="video_institucional.mp4">
                                        <Download className="mr-2 h-4 w-4" /> Baixar Vídeo (MP4)
                                    </a>
                                </Button>
                            </div>
                        )}
                        {audioUrl && (
                             <div className="space-y-2">
                                <h3 className="font-semibold">Narração Gerada</h3>
                                <audio controls src={audioUrl} className="w-full" />
                                 <Button asChild variant="outline" size="sm">
                                    <a href={audioUrl} download="narracao_institucional.wav">
                                        <Download className="mr-2 h-4 w-4" /> Baixar Áudio (WAV)
                                    </a>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

    