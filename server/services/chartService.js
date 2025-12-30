// QuickChart API 整合服務 - 產生健康報告圖表

/**
 * 產生血壓趨勢圖 URL
 * @param {Array} records - 健康紀錄陣列，每筆包含 date, systolic, diastolic
 * @param {string} elderName - 長者姓名
 * @returns {string} - QuickChart 圖片 URL
 */
function generateBPChartUrl(records, elderName) {
    // 按日期排序
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));

    // 取最近 14 筆
    const recentRecords = sortedRecords.slice(-14);

    const labels = recentRecords.map(r => {
        const date = new Date(r.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const systolicData = recentRecords.map(r => parseInt(r.systolic) || null);
    const diastolicData = recentRecords.map(r => parseInt(r.diastolic) || null);

    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '收縮壓',
                    data: systolicData,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 4
                },
                {
                    label: '舒張壓',
                    data: diastolicData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${elderName} - 血壓趨勢圖`,
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                },
                annotation: {
                    annotations: {
                        highLine: {
                            type: 'line',
                            yMin: 140,
                            yMax: 140,
                            borderColor: 'rgba(255, 0, 0, 0.5)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: '高血壓警戒',
                                enabled: true,
                                position: 'right'
                            }
                        },
                        normalLine: {
                            type: 'line',
                            yMin: 120,
                            yMax: 120,
                            borderColor: 'rgba(0, 128, 0, 0.3)',
                            borderWidth: 1,
                            borderDash: [3, 3]
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 40,
                    max: 180,
                    title: {
                        display: true,
                        text: 'mmHg'
                    }
                }
            }
        }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    return `https://quickchart.io/chart?c=${encodedConfig}&w=600&h=400&bkg=white`;
}

/**
 * 產生體溫趨勢圖 URL
 * @param {Array} records - 健康紀錄陣列
 * @param {string} elderName - 長者姓名
 * @returns {string} - QuickChart 圖片 URL
 */
function generateTempChartUrl(records, elderName) {
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    const recentRecords = sortedRecords.slice(-14);

    const labels = recentRecords.map(r => {
        const date = new Date(r.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const tempData = recentRecords.map(r => parseFloat(r.temperature) || null);

    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '體溫',
                    data: tempData,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: tempData.map(t => t > 37.5 ? '#e74c3c' : '#27ae60')
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `${elderName} - 體溫趨勢圖`,
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    display: false
                },
                annotation: {
                    annotations: {
                        feverLine: {
                            type: 'line',
                            yMin: 37.5,
                            yMax: 37.5,
                            borderColor: 'rgba(255, 165, 0, 0.7)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: '微燒警戒',
                                enabled: true
                            }
                        },
                        highFeverLine: {
                            type: 'line',
                            yMin: 38,
                            yMax: 38,
                            borderColor: 'rgba(255, 0, 0, 0.7)',
                            borderWidth: 2,
                            borderDash: [5, 5]
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 35,
                    max: 40,
                    title: {
                        display: true,
                        text: '°C'
                    }
                }
            }
        }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    return `https://quickchart.io/chart?c=${encodedConfig}&w=600&h=300&bkg=white`;
}

/**
 * 產生健康摘要卡片圖 URL
 * @param {object} latestRecord - 最新一筆健康紀錄
 * @param {object} stats - 統計資料
 * @param {string} elderName - 長者姓名
 * @returns {string} - QuickChart 圖片 URL
 */
function generateSummaryCardUrl(latestRecord, stats, elderName) {
    const labels = ['收縮壓', '舒張壓', '體溫'];

    // 正規化數據用於顯示
    const bpNormalized = latestRecord.systolic ? (latestRecord.systolic / 180 * 100) : 0;
    const dbpNormalized = latestRecord.diastolic ? (latestRecord.diastolic / 120 * 100) : 0;
    const tempNormalized = latestRecord.temperature ? ((latestRecord.temperature - 35) / 5 * 100) : 0;

    const chartConfig = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: [
                    parseInt(latestRecord.systolic) || 0,
                    parseInt(latestRecord.diastolic) || 0,
                    parseFloat(latestRecord.temperature) || 0
                ],
                backgroundColor: [
                    latestRecord.systolic >= 140 ? '#e74c3c' : latestRecord.systolic >= 120 ? '#f39c12' : '#27ae60',
                    latestRecord.diastolic >= 90 ? '#e74c3c' : latestRecord.diastolic >= 80 ? '#f39c12' : '#27ae60',
                    latestRecord.temperature > 38 ? '#e74c3c' : latestRecord.temperature > 37.5 ? '#f39c12' : '#27ae60'
                ]
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                title: {
                    display: true,
                    text: [`${elderName} - 最新健康數據`, `${latestRecord.date} ${latestRecord.time || ''}`],
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: false
                },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    formatter: (value, ctx) => {
                        if (ctx.dataIndex === 0) return `${value} mmHg`;
                        if (ctx.dataIndex === 1) return `${value} mmHg`;
                        return `${value} °C`;
                    }
                }
            },
            scales: {
                x: {
                    display: false
                }
            }
        }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    return `https://quickchart.io/chart?c=${encodedConfig}&w=500&h=250&bkg=white`;
}

module.exports = {
    generateBPChartUrl,
    generateTempChartUrl,
    generateSummaryCardUrl
};
